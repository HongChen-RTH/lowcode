import {
  Injectable,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { TCurrentUser } from '../utils/GetUserMessTool';
import {
  PostReleaseRequest,
  PostQuestionDataRequest,
  objectOmit,
} from '@lowcode/share';
import { DataSource, In } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Page, Component, ComponentData } from './entities/low-code.entity';
import { RedisModule } from 'src/utils/modules/redis.module';

@Injectable()
export class LowCodeService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Page)
    private readonly PageCodeRepository: Repository<Page>,
    @InjectRepository(Component)
    private readonly ComponentRepository: Repository<Component>,
    @InjectRepository(ComponentData)
    private readonly ComponentDataRepository: Repository<ComponentData>,
    private readonly redis: RedisModule,
  ) {}
  /**
   * 低代码发布服务
   */
  async release(body: PostReleaseRequest, user: TCurrentUser) {
    const { components, ...otherBody } = body;
    let id = null;
    const queryRunner = this.dataSource.createQueryRunner();

    // 插入页面的组件到 component 表
    async function insertComponents(pageId: number) {
      const insertComponents = [];
      for (const component of components) {
        const componentResult = await queryRunner.manager.insert(Component, {
          ...component,
          page_id: pageId,
          account_id: user.id,
        });
        insertComponents.push(componentResult.identifiers[0].id);
      }

      // 更新页面表的components字段
      await queryRunner.manager.update(Page, pageId, {
        components: insertComponents,
      });
    }

    // 更新方法
    async function updateLowCodePage(findLowCode: Page) {
      // 将 components 置空，其他属性更新
      await queryRunner.manager.update(Page, findLowCode.id, {
        ...otherBody,
        components: [],
      });

      // 删除该用户旧的 components 表数据
      for (const component of findLowCode.components)
        await queryRunner.manager.delete(Component, component);

      // 如果componentData有数据也删除
      const componentDatas = await queryRunner.manager.findBy(ComponentData, {
        page_id: findLowCode.id,
      });
      for (const componentData of componentDatas)
        await queryRunner.manager.delete(ComponentData, componentData.id);

      // 将新的组件插入
      await insertComponents(findLowCode.id);
    }
    // 创建方法
    async function createLowCodePage() {
      const lowcode = await queryRunner.manager.insert(Page, {
        ...otherBody,
        account_id: user.id,
        components: [],
      });
      const pageId = lowcode.identifiers[0].id;
      id = pageId;
      await insertComponents(pageId);
    }

    try {
      // 建立数据库连接
      await queryRunner.connect();
      // 开启新的数据库事务
      await queryRunner.startTransaction();
      // 查找当前页面是否存在
      const findLowCode = await queryRunner.manager.findBy(Page, {
        account_id: user.id,
      });

      if (findLowCode?.length > 0) {
        // 更新页面
        id = findLowCode[0].id;
        await updateLowCodePage(findLowCode[0]);
      } else {
        // 创建页面
        await createLowCodePage();
      }
    } catch (err) {
      console.log(err);
      await queryRunner.rollbackTransaction();
      throw new InternalServerErrorException(`发布失败，${err}`);
    } finally {
      await queryRunner.release();
    }
    return {
      msg: '发布成功',
      data: id,
    };
  }

  /**
   *  获取低代码组件接口服务（有缓存）
   */
  // async getReleaseData(id: number, user?: TCurrentUser) {
  //   // 缓存键，用于在 Redis 中查找或存储数据
  //   const cacheKey = `releaseData-${id}`;

  //   return await this.redis.getCachedData(
  //     cacheKey,
  //     async () => {
  //       const lowCode = await this.PageCodeRepository.findOneBy({
  //         id: id,
  //         account_id: user.id,
  //       });
  //       if (!lowCode) return;
  //       const components = await Promise.all(
  //         lowCode.components.map((componentId) =>
  //           this.ComponentRepository.findOneBy({
  //             id: Number(componentId),
  //           }).then((comp) => comp ?? undefined),
  //         ),
  //       );

  //       const filteredComponents = components.filter(
  //         (comp) => comp !== undefined,
  //       ) as Component[];

  //       return {
  //         components: filteredComponents,
  //         componentIds: lowCode.components,
  //         ...objectOmit(lowCode, ['components']),
  //       };
  //     },
  //     {
  //       ttl: 60 * 10,
  //       force: !!user.id,
  //     },
  //   );
  // }

  /**
   * 获取低代码组件接口服务（无缓存）
   */
  async getReleaseData(id: number, user?: TCurrentUser) {
    // 查找该用户是否发布过页面
    const lowCode = await this.PageCodeRepository.findOneBy({
      id,
      account_id: user?.id,
    });
    // 如果没有发布过页面就停止
    if (!lowCode) return;

    const components = [];
    const componentIds = lowCode.components;
    for (const componentId of componentIds) {
      const component = await this.ComponentRepository.findOneBy({
        id: Number(componentId),
      });
      components.push(component);
    }
    return {
      components,
      componentIds,
      ...objectOmit(lowCode, ['components']),
    };
  }

  /**
   * 发布页面是否提交过问卷服务层
   */
  async isQuestionDataPosted(key: string, pageId: number) {
    const isExist = await this.ComponentDataRepository.findOneBy({
      user: key,
      page_id: pageId,
    });
    return !!isExist;
  }

  /**
   * 发布页面提交问卷服务层
   */
  async postQuestionData(body: PostQuestionDataRequest, key: string) {
    const { page_id, props } = body;
    const isExist = await this.ComponentDataRepository.findOneBy({
      user: key,
      page_id,
    });
    if (!isExist)
      await this.ComponentDataRepository.save({ user: key, page_id, props });

    return { msg: '提交成功！感谢您的参与！' };
  }

  /**
   * 后台统计组件获取服务层
   */
  async getQuestionComponents(user: TCurrentUser) {
    return await this.ComponentRepository.findBy({
      account_id: user.id,
      type: In(['input', 'textArea', 'radio', 'checkbox']),
    });
  }

  /**
   * 问卷统计信息服务层
   */
  async getQuestionData(userId: number) {
    // 检查当前用户是否有发布过页面
    const lowCodePage = await this.PageCodeRepository.findOneBy({
      account_id: userId,
    });
    if (!lowCodePage)
      throw new BadRequestException('未找到页面，请先发布页面信息');

    const componentDatas = await this.ComponentDataRepository.findBy({
      page_id: lowCodePage.id,
    });
    const matchesComponetDatas = await Promise.all(
      componentDatas.map(async (comp) => {
        return await Promise.all(
          comp.props.map(async (item) => {
            const componentResult = await this.ComponentRepository.findOneBy({
              id: item.id,
            });
            return {
              result: item,
              type: componentResult?.type,
              options: componentResult?.options?.options || {},
            };
          }),
        );
      }),
    );

    return matchesComponetDatas;
  }

  /**
   * 后台统计组件通过ID获取问卷数据服务层
   */
  async getQuestionDataByIdRequest({ id, userId }) {
    const lowCodePage = await this.PageCodeRepository.findOneBy({
      account_id: userId,
    });
    if (!lowCodePage)
      throw new BadRequestException('未找到页面，请先发布页面信息');

    const componentDatas = await this.ComponentDataRepository.findBy({
      page_id: lowCodePage.id,
    });
    const matchesComponetDatas = await Promise.all(
      componentDatas
        .map((comp) =>
          comp.props
            .filter((item) => item.id === id)
            .map(async (item) => {
              const componentResult = await this.ComponentRepository.findOneBy({
                id: item.id,
              });
              return {
                value: Array.isArray(item.value)
                  ? item.value
                  : [item.value] || null,
                options: componentResult?.options?.options || null,
              };
            }),
        )
        .flat(),
    );

    return matchesComponetDatas;
  }
}
