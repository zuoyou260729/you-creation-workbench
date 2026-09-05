/* ==========================================
   物品统计模块 · PersonalWorkbench Items v2
   ========================================== */
(function () {
  'use strict';
  window.APP_VERSION = 'v32';   // 与 sw.js 的 CACHE 版本保持一致，用于同步弹窗显示

  const ITEMS_KEY = 'wb_items_v2';
  const CATS_KEY = 'wb_item_categories_v2';
  const SETTINGS_KEY = 'wb_items_settings_v2';
  const TOMB_KEY = 'wb_items_tombstones_v2';   // 删除同步：记录已删除物品/分类 id

  const UNCATEGORIZED_ID = 'cat_uncategorized';

  // 云端同步配置（由 js/sync-config.js 注入，含 backend / github / gitee 三段）
  // 实际读写通过下方的 sync*() 后端无关函数，按 SYNC_CONFIG.backend 选择 GitHub / Gitee。
  const SYNC_CONFIG = (typeof window !== 'undefined' && window.SYNC_CONFIG) ? window.SYNC_CONFIG : null;

  let TOMB = [];   // 已删除 id 列表（内存态，load 时从 localStorage 恢复）

  const DEFAULT_ICONS = [
    '📦','🧻','🧴','🧹','🧽','🪣','🧺','🛏','🪑','🛋','🚪','🪟','💡','🔌','🧯','🪜','🔧','🔨','🪛','🧰',
    '📱','💻','🖥','⌨','🖱','🖨','📷','🎧','⌚','🎮','📺','🔊','🔋','💾','📀','🧊','🍽','🥢','🍳','☕',
    '🧂','🥛','🍺','🧃','🥤','🥣','🍴','🔪','🥄','🧊','🛁','🚿','🚽','🪥','🧼','🧽','🧻','🪒','🧴','💄',
    '👕','👖','👗','👟','🧥','🧣','🧤','🧦','🎒','👜','👓','🌂','🧢','🪖','⛺','🎣','⚽','🏀','🚲','🛹',
    '🧸','🍼','🚗','🛵','🛞','⛽','🧯','💊','💉','🩹','🩺','🎸','🎹','🎨','🃏','🐕','🐈','🦜','🐟','🌵'
  ];

  const SYSTEM_PRIMARY = [
    { id:'sys_digital', name:'数码产品', icon:'📱' },
    { id:'sys_clothing', name:'衣服鞋包', icon:'👕' },
    { id:'sys_beauty', name:'个护美妆', icon:'💄' },
    { id:'sys_appliance', name:'家用电器', icon:'📺' },
    { id:'sys_home', name:'家居日用', icon:'🛋' },
    { id:'sys_office', name:'办公学习', icon:'📚' },
    { id:'sys_outdoor', name:'户外运动', icon:'⛺' },
    { id:'sys_baby', name:'母婴儿童', icon:'🍼' },
    { id:'sys_transport', name:'交通出行', icon:'🚲' },
    { id:'sys_medical', name:'健康医疗', icon:'💊' },
    { id:'sys_collection', name:'收藏爱好', icon:'🎸' },
    { id:'sys_pet', name:'宠物用品', icon:'🐕' },
    { id:'sys_hardware', name:'家装五金', icon:'🔧' },
    { id:'sys_vehicle', name:'车辆用品', icon:'🚗' },
    { id:'sys_asset', name:'固定资产', icon:'🏠' },
    { id:'sys_service', name:'服务项目', icon:'🛎' },
    { id:'sys_virtual', name:'虚拟产品', icon:'🎫' },
    { id:'sys_other', name:'其他', icon:'📦' }
  ];

  const SYSTEM_SECONDARY = {
    sys_digital: ['手机','笔记本电脑','台式电脑','平板电脑','相机','镜头','无人机','NAS','路由器','键盘','鼠标','显示器','打印机','音箱','耳机','智能手表','游戏机','投影仪','电子书','充电宝','硬盘','固态硬盘','U盘','存储卡','CPU','显卡','主板','内存','散热器','风扇','电源','机箱','音频设备','智能眼镜','加湿器'],
    sys_clothing: ['T恤','衬衫','毛衣','卫衣','外套','羽绒服','西装','裤子','牛仔裤','半身裙','连衣裙','内衣','袜子','运动鞋','靴子','拖鞋','雨鞋','双肩包','手提包','钱包','帽子','围巾','手套','皮带','其他'],
    sys_beauty: ['洁面','爽肤水','精华','乳液','面霜','防晒','面膜','眼霜','彩妆','香水','剃须刀','洗发护发','身体护理','女性护理','口腔健康','时尚配饰','其他'],
    sys_appliance: ['冰箱','洗衣机','烘干机','空调','电视','热水器','油烟机','洗碗机','微波炉','电磁炉','烤箱','电饭煲','空气炸锅','咖啡机','破壁机','吸尘器','扫地机器人','空气净化器','加湿器','电风扇','吹风机','洗地机','其他'],
    sys_home: ['沙发','床','床垫','桌子','椅子','柜子','收纳','衣架','雨伞','厨具','餐具','清洁品','洗衣用品','茶几','灯具','家纺','其他'],
    sys_office: ['书籍','计算器','书写用品','绘画工具','办公用品','裁剪用品','胶粘用品','收纳用品','其他'],
    sys_outdoor: ['帐篷','天幕','睡袋','徒步登山','电器照明','钓鱼用品','球（拍）类','健身器材','滑雪用品','游泳用品','攀岩用品','防护救生','其他'],
    sys_baby: ['婴儿车','安全座椅','婴儿床','奶瓶','配方奶粉','纸尿裤','湿巾','童装','童鞋','玩具','绘本','孕妈用品','其他'],
    sys_transport: ['自行车','电动车','摩托车','头盔','行李箱','颈枕','转换插头','其他'],
    sys_medical: ['药品','急救用品','体温计','血压计','血糖仪','体重秤','按摩器械','眼镜','隐形眼镜','助听器','医学美容','手术治疗','其他'],
    sys_collection: ['手办','卡牌','邮票','纪念币','徽章','模型','乐器','唱片','艺术品','其他'],
    sys_pet: ['宠物粮','食盆','猫砂','宠物包','牵引绳','宠物玩具','洗护用品','宠物窝','宠物服饰','其他'],
    sys_hardware: ['油漆','墙纸','瓷砖','地板','水龙头','花洒','马桶','水槽','开关插座','门锁','家装工具','其他'],
    sys_vehicle: ['行车记录仪','车载支架','车载充电器','车载吸尘器','车载香薰','座套','脚垫','轮胎','机油','雨刮器','电瓶','洗车用品','其他'],
    sys_asset: ['车辆','住宅','公寓','商铺','车位','其他资产'],
    sys_service: ['课程培训','保险服务','其他服务'],
    sys_virtual: ['游戏点卡','会员订阅','其他虚拟'],
    sys_other: ['礼品','票券','其他物品']
  };

  // 系统二级分类图标映射（图片路径优先，缺失则回退 emoji）
  // 键格式: "{parentId}:{二级分类名}",值: 相对于站点根目录的图片路径
  const SYSTEM_ICON_MAP = {
    'sys_appliance:冰箱':'assets/items/icons/sys_appliance_冰箱.png',
    'sys_appliance:加湿器':'assets/items/icons/sys_appliance_加湿器.png',
    'sys_appliance:吸尘器':'assets/items/icons/sys_appliance_吸尘器.png',
    'sys_appliance:吹风机':'assets/items/icons/sys_appliance_吹风机.png',
    'sys_appliance:咖啡机':'assets/items/icons/sys_appliance_咖啡机.png',
    'sys_appliance:微波炉':'assets/items/icons/sys_appliance_微波炉.png',
    'sys_appliance:扫地机器人':'assets/items/icons/sys_appliance_扫地机器人.png',
    'sys_appliance:油烟机':'assets/items/icons/sys_appliance_油烟机.png',
    'sys_appliance:洗地机':'assets/items/icons/sys_appliance_洗地机.png',
    'sys_appliance:洗碗机':'assets/items/icons/sys_appliance_洗碗机.png',
    'sys_appliance:洗衣机':'assets/items/icons/sys_appliance_洗衣机.png',
    'sys_appliance:烘干机':'assets/items/icons/sys_appliance_烘干机.png',
    'sys_appliance:烤箱':'assets/items/icons/sys_appliance_烤箱.png',
    'sys_appliance:热水器':'assets/items/icons/sys_appliance_热水器.png',
    'sys_appliance:电磁炉':'assets/items/icons/sys_appliance_电磁炉.png',
    'sys_appliance:电视':'assets/items/icons/sys_appliance_电视.png',
    'sys_appliance:电风扇':'assets/items/icons/sys_appliance_电风扇.png',
    'sys_appliance:电饭煲':'assets/items/icons/sys_appliance_电饭煲.png',
    'sys_appliance:破壁机':'assets/items/icons/sys_appliance_破壁机.png',
    'sys_appliance:空气净化器':'assets/items/icons/sys_appliance_空气净化器.png',
    'sys_appliance:空气炸锅':'assets/items/icons/sys_appliance_空气炸锅.png',
    'sys_appliance:空调':'assets/items/icons/sys_appliance_空调.png',
    'sys_asset:住宅':'assets/items/icons/sys_asset_住宅.png',
    'sys_asset:公寓':'assets/items/icons/sys_asset_公寓.png',
    'sys_asset:其他资产':'assets/items/icons/sys_asset_其他资产.png',
    'sys_asset:商铺':'assets/items/icons/sys_asset_商铺.png',
    'sys_asset:车位':'assets/items/icons/sys_asset_车位.png',
    'sys_asset:车辆':'assets/items/icons/sys_asset_车辆.png',
    'sys_baby:其他':'assets/items/icons/sys_baby_其他.png',
    'sys_baby:奶瓶':'assets/items/icons/sys_baby_奶瓶.png',
    'sys_baby:婴儿床':'assets/items/icons/sys_baby_婴儿床.png',
    'sys_baby:婴儿车':'assets/items/icons/sys_baby_婴儿车.png',
    'sys_baby:孕妈用品':'assets/items/icons/sys_baby_孕妈用品.png',
    'sys_baby:安全座椅':'assets/items/icons/sys_baby_安全座椅.png',
    'sys_baby:湿巾':'assets/items/icons/sys_baby_湿巾.png',
    'sys_baby:玩具':'assets/items/icons/sys_baby_玩具.png',
    'sys_baby:童装':'assets/items/icons/sys_baby_童装.png',
    'sys_baby:童鞋':'assets/items/icons/sys_baby_童鞋.png',
    'sys_baby:纸尿裤':'assets/items/icons/sys_baby_纸尿裤.png',
    'sys_baby:绘本':'assets/items/icons/sys_baby_绘本.png',
    'sys_baby:配方奶粉':'assets/items/icons/sys_baby_配方奶粉.png',
    'sys_beauty:乳液':'assets/items/icons/sys_beauty_乳液.png',
    'sys_beauty:其他':'assets/items/icons/sys_beauty_其他.png',
    'sys_beauty:剃须刀':'assets/items/icons/sys_beauty_剃须刀.png',
    'sys_beauty:口腔健康':'assets/items/icons/sys_beauty_口腔健康.png',
    'sys_beauty:女性护理':'assets/items/icons/sys_beauty_女性护理.png',
    'sys_beauty:彩妆':'assets/items/icons/sys_beauty_彩妆.png',
    'sys_beauty:时尚配饰':'assets/items/icons/sys_beauty_时尚配饰.png',
    'sys_beauty:洁面':'assets/items/icons/sys_beauty_洁面.png',
    'sys_beauty:洗发护发':'assets/items/icons/sys_beauty_洗发护发.png',
    'sys_beauty:爽肤水':'assets/items/icons/sys_beauty_爽肤水.png',
    'sys_beauty:眼霜':'assets/items/icons/sys_beauty_眼霜.png',
    'sys_beauty:精华':'assets/items/icons/sys_beauty_精华.png',
    'sys_beauty:身体护理':'assets/items/icons/sys_beauty_身体护理.png',
    'sys_beauty:防晒':'assets/items/icons/sys_beauty_防晒.png',
    'sys_beauty:面膜':'assets/items/icons/sys_beauty_面膜.png',
    'sys_beauty:面霜':'assets/items/icons/sys_beauty_面霜.png',
    'sys_beauty:香水':'assets/items/icons/sys_beauty_香水.png',
    'sys_clothing:T恤':'assets/items/icons/sys_clothing_T恤.png',
    'sys_clothing:内衣':'assets/items/icons/sys_clothing_内衣.png',
    'sys_clothing:半身裙':'assets/items/icons/sys_clothing_半身裙.png',
    'sys_clothing:卫衣':'assets/items/icons/sys_clothing_卫衣.png',
    'sys_clothing:双肩包':'assets/items/icons/sys_clothing_双肩包.png',
    'sys_clothing:围巾':'assets/items/icons/sys_clothing_围巾.png',
    'sys_clothing:外套':'assets/items/icons/sys_clothing_外套.png',
    'sys_clothing:帽子':'assets/items/icons/sys_clothing_帽子.png',
    'sys_clothing:手套':'assets/items/icons/sys_clothing_手套.png',
    'sys_clothing:手提包':'assets/items/icons/sys_clothing_手提包.png',
    'sys_clothing:拖鞋':'assets/items/icons/sys_clothing_拖鞋.png',
    'sys_clothing:毛衣':'assets/items/icons/sys_clothing_毛衣.png',
    'sys_clothing:牛仔裤':'assets/items/icons/sys_clothing_牛仔裤.png',
    'sys_clothing:皮带':'assets/items/icons/sys_clothing_皮带.png',
    'sys_clothing:羽绒服':'assets/items/icons/sys_clothing_羽绒服.png',
    'sys_clothing:衬衫':'assets/items/icons/sys_clothing_衬衫.png',
    'sys_clothing:袜子':'assets/items/icons/sys_clothing_袜子.png',
    'sys_clothing:裤子':'assets/items/icons/sys_clothing_裤子.png',
    'sys_clothing:西装':'assets/items/icons/sys_clothing_西装.png',
    'sys_clothing:运动鞋':'assets/items/icons/sys_clothing_运动鞋.png',
    'sys_clothing:连衣裙':'assets/items/icons/sys_clothing_连衣裙.png',
    'sys_clothing:钱包':'assets/items/icons/sys_clothing_钱包.png',
    'sys_clothing:雨鞋':'assets/items/icons/sys_clothing_雨鞋.png',
    'sys_clothing:靴子':'assets/items/icons/sys_clothing_靴子.png',
    'sys_collection:乐器':'assets/items/icons/sys_collection_乐器.png',
    'sys_collection:其他':'assets/items/icons/sys_collection_其他.png',
    'sys_collection:卡牌':'assets/items/icons/sys_collection_卡牌.png',
    'sys_collection:唱片':'assets/items/icons/sys_collection_唱片.png',
    'sys_collection:徽章':'assets/items/icons/sys_collection_徽章.png',
    'sys_collection:手办':'assets/items/icons/sys_collection_手办.png',
    'sys_collection:模型':'assets/items/icons/sys_collection_模型.png',
    'sys_collection:纪念币':'assets/items/icons/sys_collection_纪念币.png',
    'sys_collection:艺术品':'assets/items/icons/sys_collection_艺术品.png',
    'sys_collection:邮票':'assets/items/icons/sys_collection_邮票.png',
    'sys_digital:CPU':'assets/items/icons/sys_digital_CPU.png',
    'sys_digital:NAS':'assets/items/icons/sys_digital_NAS.png',
    'sys_digital:U盘':'assets/items/icons/sys_digital_U盘.png',
    'sys_digital:主板':'assets/items/icons/sys_digital_主板.png',
    'sys_digital:充电宝':'assets/items/icons/sys_digital_充电宝.png',
    'sys_digital:内存':'assets/items/icons/sys_digital_内存.png',
    'sys_digital:加湿器':'assets/items/icons/sys_digital_加湿器.png',
    'sys_digital:台式电脑':'assets/items/icons/sys_digital_台式电脑.png',
    'sys_digital:固态硬盘':'assets/items/icons/sys_digital_固态硬盘.png',
    'sys_digital:存储卡':'assets/items/icons/sys_digital_存储卡.png',
    'sys_digital:平板电脑':'assets/items/icons/sys_digital_平板电脑.png',
    'sys_digital:手机':'assets/items/icons/sys_digital_手机.png',
    'sys_digital:打印机':'assets/items/icons/sys_digital_打印机.png',
    'sys_digital:投影仪':'assets/items/icons/sys_digital_投影仪.png',
    'sys_digital:散热器':'assets/items/icons/sys_digital_散热器.png',
    'sys_digital:无人机':'assets/items/icons/sys_digital_无人机.png',
    'sys_digital:显卡':'assets/items/icons/sys_digital_显卡.png',
    'sys_digital:显示器':'assets/items/icons/sys_digital_显示器.png',
    'sys_digital:智能手表':'assets/items/icons/sys_digital_智能手表.png',
    'sys_digital:智能眼镜':'assets/items/icons/sys_digital_智能眼镜.png',
    'sys_digital:机箱':'assets/items/icons/sys_digital_机箱.png',
    'sys_digital:游戏机':'assets/items/icons/sys_digital_游戏机.png',
    'sys_digital:电子书':'assets/items/icons/sys_digital_电子书.png',
    'sys_digital:电源':'assets/items/icons/sys_digital_电源.png',
    'sys_digital:相机':'assets/items/icons/sys_digital_相机.png',
    'sys_digital:硬盘':'assets/items/icons/sys_digital_硬盘.png',
    'sys_digital:笔记本电脑':'assets/items/icons/sys_digital_笔记本电脑.png',
    'sys_digital:耳机':'assets/items/icons/sys_digital_耳机.png',
    'sys_digital:路由器':'assets/items/icons/sys_digital_路由器.png',
    'sys_digital:键盘':'assets/items/icons/sys_digital_键盘.png',
    'sys_digital:镜头':'assets/items/icons/sys_digital_镜头.png',
    'sys_digital:音箱':'assets/items/icons/sys_digital_音箱.png',
    'sys_digital:音频设备':'assets/items/icons/sys_digital_音频设备.png',
    'sys_digital:风扇':'assets/items/icons/sys_digital_风扇.png',
    'sys_digital:鼠标':'assets/items/icons/sys_digital_鼠标.png',
    'sys_hardware:其他':'assets/items/icons/sys_hardware_其他.png',
    'sys_hardware:地板':'assets/items/icons/sys_hardware_地板.png',
    'sys_hardware:墙纸':'assets/items/icons/sys_hardware_墙纸.png',
    'sys_hardware:家装工具':'assets/items/icons/sys_hardware_家装工具.png',
    'sys_hardware:开关插座':'assets/items/icons/sys_hardware_开关插座.png',
    'sys_hardware:水槽':'assets/items/icons/sys_hardware_水槽.png',
    'sys_hardware:水龙头':'assets/items/icons/sys_hardware_水龙头.png',
    'sys_hardware:油漆':'assets/items/icons/sys_hardware_油漆.png',
    'sys_hardware:瓷砖':'assets/items/icons/sys_hardware_瓷砖.png',
    'sys_hardware:花洒':'assets/items/icons/sys_hardware_花洒.png',
    'sys_hardware:门锁':'assets/items/icons/sys_hardware_门锁.png',
    'sys_hardware:马桶':'assets/items/icons/sys_hardware_马桶.png',
    'sys_home:其他':'assets/items/icons/sys_home_其他.png',
    'sys_home:厨具':'assets/items/icons/sys_home_厨具.png',
    'sys_home:家纺':'assets/items/icons/sys_home_家纺.png',
    'sys_home:床':'assets/items/icons/sys_home_床.png',
    'sys_home:床垫':'assets/items/icons/sys_home_床垫.png',
    'sys_home:收纳':'assets/items/icons/sys_home_收纳.png',
    'sys_home:柜子':'assets/items/icons/sys_home_柜子.png',
    'sys_home:桌子':'assets/items/icons/sys_home_桌子.png',
    'sys_home:椅子':'assets/items/icons/sys_home_椅子.png',
    'sys_home:沙发':'assets/items/icons/sys_home_沙发.png',
    'sys_home:洗衣用品':'assets/items/icons/sys_home_洗衣用品.png',
    'sys_home:清洁品':'assets/items/icons/sys_home_清洁品.png',
    'sys_home:灯具':'assets/items/icons/sys_home_灯具.png',
    'sys_home:茶几':'assets/items/icons/sys_home_茶几.png',
    'sys_home:衣架':'assets/items/icons/sys_home_衣架.png',
    'sys_home:雨伞':'assets/items/icons/sys_home_雨伞.png',
    'sys_home:餐具':'assets/items/icons/sys_home_餐具.png',
    'sys_medical:体温计':'assets/items/icons/sys_medical_体温计.png',
    'sys_medical:体重秤':'assets/items/icons/sys_medical_体重秤.png',
    'sys_medical:其他':'assets/items/icons/sys_medical_其他.png',
    'sys_medical:助听器':'assets/items/icons/sys_medical_助听器.png',
    'sys_medical:医学美容':'assets/items/icons/sys_medical_医学美容.png',
    'sys_medical:急救用品':'assets/items/icons/sys_medical_急救用品.png',
    'sys_medical:手术治疗':'assets/items/icons/sys_medical_手术治疗.png',
    'sys_medical:按摩器械':'assets/items/icons/sys_medical_按摩器械.png',
    'sys_medical:眼镜':'assets/items/icons/sys_medical_眼镜.png',
    'sys_medical:药品':'assets/items/icons/sys_medical_药品.png',
    'sys_medical:血压计':'assets/items/icons/sys_medical_血压计.png',
    'sys_medical:血糖仪':'assets/items/icons/sys_medical_血糖仪.png',
    'sys_medical:隐形眼镜':'assets/items/icons/sys_medical_隐形眼镜.png',
    'sys_office:书写用品':'assets/items/icons/sys_office_书写用品.png',
    'sys_office:书籍':'assets/items/icons/sys_office_书籍.png',
    'sys_office:其他':'assets/items/icons/sys_office_其他.png',
    'sys_office:办公用品':'assets/items/icons/sys_office_办公用品.png',
    'sys_office:收纳用品':'assets/items/icons/sys_office_收纳用品.png',
    'sys_office:绘画工具':'assets/items/icons/sys_office_绘画工具.png',
    'sys_office:胶粘用品':'assets/items/icons/sys_office_胶粘用品.png',
    'sys_office:裁剪用品':'assets/items/icons/sys_office_裁剪用品.png',
    'sys_office:计算器':'assets/items/icons/sys_office_计算器.png',
    'sys_other:礼品':'assets/items/icons/sys_other_礼品.png',
    'sys_other:票券':'assets/items/icons/sys_other_票券.png',
    'sys_outdoor:健身器材':'assets/items/icons/sys_outdoor_健身器材.png',
    'sys_outdoor:天幕':'assets/items/icons/sys_outdoor_天幕.png',
    'sys_outdoor:帐篷':'assets/items/icons/sys_outdoor_帐篷.png',
    'sys_outdoor:徒步登山':'assets/items/icons/sys_outdoor_徒步登山.png',
    'sys_outdoor:攀岩用品':'assets/items/icons/sys_outdoor_攀岩用品.png',
    'sys_outdoor:游泳用品':'assets/items/icons/sys_outdoor_游泳用品.png',
    'sys_outdoor:滑雪用品':'assets/items/icons/sys_outdoor_滑雪用品.png',
    'sys_outdoor:球（拍）类':'assets/items/icons/sys_outdoor_球（拍）类.png',
    'sys_outdoor:电器照明':'assets/items/icons/sys_outdoor_电器照明.png',
    'sys_outdoor:睡袋':'assets/items/icons/sys_outdoor_睡袋.png',
    'sys_outdoor:钓鱼用品':'assets/items/icons/sys_outdoor_钓鱼用品.png',
    'sys_outdoor:防护救生':'assets/items/icons/sys_outdoor_防护救生.png',
    'sys_pet:其他':'assets/items/icons/sys_pet_其他.png',
    'sys_pet:宠物包':'assets/items/icons/sys_pet_宠物包.png',
    'sys_pet:宠物服饰':'assets/items/icons/sys_pet_宠物服饰.png',
    'sys_pet:宠物玩具':'assets/items/icons/sys_pet_宠物玩具.png',
    'sys_pet:宠物窝':'assets/items/icons/sys_pet_宠物窝.png',
    'sys_pet:宠物粮':'assets/items/icons/sys_pet_宠物粮.png',
    'sys_pet:洗护用品':'assets/items/icons/sys_pet_洗护用品.png',
    'sys_pet:牵引绳':'assets/items/icons/sys_pet_牵引绳.png',
    'sys_pet:猫砂':'assets/items/icons/sys_pet_猫砂.png',
    'sys_pet:食盆':'assets/items/icons/sys_pet_食盆.png',
    'sys_service:课程培训':'assets/items/icons/sys_service_课程培训.png',
    'sys_vehicle:其他':'assets/items/icons/sys_vehicle_其他.png',
    'sys_vehicle:座套':'assets/items/icons/sys_vehicle_座套.png',
    'sys_vehicle:机油':'assets/items/icons/sys_vehicle_机油.png',
    'sys_vehicle:洗车用品':'assets/items/icons/sys_vehicle_洗车用品.png',
    'sys_vehicle:电瓶':'assets/items/icons/sys_vehicle_电瓶.png',
    'sys_vehicle:脚垫':'assets/items/icons/sys_vehicle_脚垫.png',
    'sys_vehicle:行车记录仪':'assets/items/icons/sys_vehicle_行车记录仪.png',
    'sys_vehicle:车载充电器':'assets/items/icons/sys_vehicle_车载充电器.png',
    'sys_vehicle:车载吸尘器':'assets/items/icons/sys_vehicle_车载吸尘器.png',
    'sys_vehicle:车载支架':'assets/items/icons/sys_vehicle_车载支架.png',
    'sys_vehicle:车载香薰':'assets/items/icons/sys_vehicle_车载香薰.png',
    'sys_vehicle:轮胎':'assets/items/icons/sys_vehicle_轮胎.png',
    'sys_vehicle:雨刮器':'assets/items/icons/sys_vehicle_雨刮器.png',
    'sys_virtual:游戏点卡':'assets/items/icons/sys_virtual_游戏点卡.png',
    // —— 补齐此前因相对高度阈值被漏提的二级图标 ——
    'sys_transport:自行车':'assets/items/icons/sys_transport_自行车.png',
    'sys_transport:电动车':'assets/items/icons/sys_transport_电动车.png',
    'sys_transport:摩托车':'assets/items/icons/sys_transport_摩托车.png',
    'sys_transport:头盔':'assets/items/icons/sys_transport_头盔.png',
    'sys_transport:行李箱':'assets/items/icons/sys_transport_行李箱.png',
    'sys_transport:颈枕':'assets/items/icons/sys_transport_颈枕.png',
    'sys_transport:转换插头':'assets/items/icons/sys_transport_转换插头.png',
    'sys_transport:其他':'assets/items/icons/sys_transport_其他.png',
    'sys_service:保险服务':'assets/items/icons/sys_service_保险服务.png',
    'sys_service:其他服务':'assets/items/icons/sys_service_其他服务.png',
    'sys_virtual:会员订阅':'assets/items/icons/sys_virtual_会员订阅.png',
    'sys_virtual:其他虚拟':'assets/items/icons/sys_virtual_其他虚拟.png'
  };

  const SORT_FIELDS = [
    { key:'purchaseDate', label:'购买时间', asc:'由远及近', desc:'由近及远' },
    { key:'price', label:'购买价格', asc:'由低到高', desc:'由高到低' },
    { key:'usageCount', label:'使用次数', asc:'由少到多', desc:'由多到少' },
    { key:'holdingDays', label:'持有天数', asc:'由短到长', desc:'由长到短' },
    { key:'dailyCost', label:'日均成本', asc:'由低到高', desc:'由高到低' }
  ];

  let state = {
    items: [],
    customCategories: [],
    settings: {
      hideAmount: false,
      viewMode: 'grid',
      sortField: 'purchaseDate',
      sortDir: 'asc',
      filters: { categories: [], statuses: [], starred: false }
    }
  };

  let temp = {
    formTab: 'single',
    selectedCategory: null,
    selectedIcon: '📦',
    editId: null,
    dateTarget: null,
    dateValue: null,
    expiryValue: '',
    expiryUnit: 'day',
    expandedCats: new Set()
  };

  /* ===== 工具函数 ===== */
  function $(sel, ctx=document){ return ctx.querySelector(sel); }
  function $$(sel, ctx=document){ return [...ctx.querySelectorAll(sel)]; }
  function uuid(){ return Math.random().toString(36).slice(2)+Date.now().toString(36); }
  function todayStr(){
    const d=new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }
  function parseDate(s){
    if(!s) return null;
    const [y,m,d]=s.split('-').map(Number);
    return new Date(y,m-1,d);
  }
  function daysDiffInclusive(a,b){
    const da=parseDate(a), db=parseDate(b);
    if(!da||!db) return 0;
    return Math.floor((db-da)/86400000)+1;
  }
  function daysDiff(a,b){
    const da=parseDate(a), db=parseDate(b);
    if(!da||!db) return 0;
    return Math.floor((db-da)/86400000);
  }
  function daysInMonth(y,m){ return new Date(y,m,0).getDate(); }
  function addMonthsSafe(s, n){
    const [y,m,d]=s.split('-').map(Number);
    let ny=y, nm=m+n;
    while(nm>12){ nm-=12; ny+=1; }
    while(nm<1){ nm+=12; ny-=1; }
    const nd=Math.min(d, daysInMonth(ny,nm));
    return `${ny}-${String(nm).padStart(2,'0')}-${String(nd).padStart(2,'0')}`;
  }
  function addYearsSafe(s, n){
    const [y,m,d]=s.split('-').map(Number);
    const ny=y+n;
    const nd=Math.min(d, daysInMonth(ny,m));
    return `${ny}-${String(m).padStart(2,'0')}-${String(nd).padStart(2,'0')}`;
  }
  function formatMoney(n){
    const v=Number(n)||0;
    return '¥'+v.toFixed(2);
  }
  function escapeHtml(s){ return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function renderIcon(icon, alt='', cls=''){
    if(!icon) icon='📁';
    let inner;
    if(icon.includes('/') || icon.startsWith('data:')){
      inner = `<img src="${icon}" class="i-icon-img" alt="${escapeHtml(alt)}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='inline'">` +
              `<span class="i-icon-fallback" style="display:none">📁</span>`;
    } else {
      inner = `<span class="i-icon-emoji">${icon}</span>`;
    }
    // 传了容器类时用 <span> 包一层做固定尺寸圆形容器，img 在内部按 70% 居中，
    // 避免容器类(width:34px)与 .i-icon-img(width:70%) 同加在 <img> 上互相覆盖成椭圆。
    return cls ? `<span class="${cls}">${inner}</span>` : inner;
  }

  /* ===== 横向滚动容器支持鼠标拖拽（手机端 touch 原生滚动，桌面端加 drag） ===== */
  function enableDragScroll(container){
    if(!container) return;
    let isDown=false, startX, scrollLeft;
    container.style.cursor='grab';
    container.style.userSelect='none';
    container.addEventListener('mousedown', e=>{
      isDown=true;
      container.classList.add('dragging');
      container.style.cursor='grabbing';
      startX=e.pageX-container.offsetLeft;
      scrollLeft=container.scrollLeft;
    });
    container.addEventListener('mouseleave', ()=>{
      isDown=false;
      container.classList.remove('dragging');
      container.style.cursor='grab';
    });
    container.addEventListener('mouseup', ()=>{
      isDown=false;
      container.classList.remove('dragging');
      container.style.cursor='grab';
    });
    container.addEventListener('mousemove', e=>{
      if(!isDown) return;
      e.preventDefault();
      const x=e.pageX-container.offsetLeft;
      const walk=(x-startX)*1.2;
      container.scrollLeft=scrollLeft-walk;
    });
    // 滚轮横向滚动
    container.addEventListener('wheel', e=>{
      if(e.deltaY!==0 && container.scrollWidth>container.clientWidth){
        e.preventDefault();
        container.scrollLeft+=e.deltaY;
      }
    }, {passive:false});
  }
  function showToast(msg){
    let toast=document.getElementById('toast');
    if(!toast){ toast=document.createElement('div'); toast.id='toast'; toast.className='toast'; document.body.appendChild(toast); }
    toast.textContent=msg;
    toast.classList.add('show');
    clearTimeout(showToast._timer);
    showToast._timer=setTimeout(()=>toast.classList.remove('show'),2000);
  }
  // 页面正中提示（用于「收藏功能暂未启用」等占位提示）
  function showCenterToast(msg){
    let el=document.getElementById('iCenterToast');
    if(!el){
      el=document.createElement('div');
      el.id='iCenterToast';
      el.className='i-center-toast';
      document.body.appendChild(el);
    }
    el.textContent=msg;
    // 强制重排以确保动画每次都触发
    void el.offsetWidth;
    el.classList.add('show');
    clearTimeout(showCenterToast._timer);
    showCenterToast._timer=setTimeout(()=>el.classList.remove('show'), 1800);
  }
  // 置顶：最多 10 个
  function togglePin(g){
    const MAX_PIN=10;
    const groups=groupItems(state.items).groups;
    if(!g.pinned){
      const pinnedCount=groups.filter(x=>x.pinned).length;
      if(pinnedCount>=MAX_PIN){
        showCenterToast(`最多可置顶 ${MAX_PIN} 个物品`);
        return;
      }
    }
    const next=!g.pinned;
    g.items.forEach(it=>{ it.pinned=next; });
    save();
    renderOverview();
    showToast(next?'已置顶':'已取消置顶');
  }

  /* ===== 数据持久化 ===== */
  function load(){
    try{
      state.items=JSON.parse(localStorage.getItem(ITEMS_KEY))||[];
      state.customCategories=JSON.parse(localStorage.getItem(CATS_KEY))||[];
      state.settings=Object.assign(state.settings, JSON.parse(localStorage.getItem(SETTINGS_KEY))||{});
      TOMB=JSON.parse(localStorage.getItem(TOMB_KEY))||[];

      // 自动恢复：如果主键为空但备份有数据，说明 localStorage 被清空过
      //（PWA 重装、浏览器清理存储等），从备份恢复。
      if(state.items.length===0){
        const bk=JSON.parse(localStorage.getItem(ITEMS_KEY+'_backup'))||[];
        if(bk.length>0){
          state.items=bk;
          console.log('[items] 从备份恢复物品数据:', bk.length, '条');
        }
      }
      if(state.customCategories.length<=1){
        const bk=JSON.parse(localStorage.getItem(CATS_KEY+'_backup'))||[];
        if(bk.length>1){
          state.customCategories=bk;
          console.log('[items] 从备份恢复分类数据:', bk.length, '条');
        }
      }
    }catch(e){ console.warn('items load failed',e); }
    ensureUncategorized();
    // 旧数据模型 → 批次模型迁移（幂等）
    migrateItemsToBatches();
    // 同一天多次入库合并为一条批次（修复旧数据里每条入库都独立成行的问题）
    consolidateAllBatches();
  }
  function save(){
    localStorage.setItem(ITEMS_KEY, JSON.stringify(state.items));
    localStorage.setItem(CATS_KEY, JSON.stringify(state.customCategories));
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
    localStorage.setItem(TOMB_KEY, JSON.stringify(TOMB));
    // 同时写入备份键：PWA 重装/浏览器清理存储后主键可能被清，
    // 备份键名不同，被一起清除的概率较低，可作为恢复源。
    try{
      localStorage.setItem(ITEMS_KEY+'_backup', JSON.stringify(state.items));
      localStorage.setItem(CATS_KEY+'_backup', JSON.stringify(state.customCategories));
      localStorage.setItem(SETTINGS_KEY+'_backup', JSON.stringify(state.settings));
      localStorage.setItem(TOMB_KEY+'_backup', JSON.stringify(TOMB));
    }catch(e){ /* quota 超限时忽略备份失败 */ }
  }
  function ensureUncategorized(){
    if(!state.customCategories.find(c=>c.id===UNCATEGORIZED_ID)){
      state.customCategories.unshift({ id:UNCATEGORIZED_ID, name:'未分类', icon:'📁', system:false });
    }
  }

  /* ===== 数据模型迁移 (v2 → v3 批次模型) =====
     旧模型：item.quantity / item.price / item.stockQty / item.inUseQty ...
     新模型：item.batches[] (入库批次) + item.usings[] (取用记录)
     迁移策略：旧物品视为 1 个批次（取 purchaseDate 生成 batchId=YYYYMMDD入库），
     usings[] 留空。运行后保存一次即固化。 */
  function migrateItemsToBatches(){
    let changed=false;
    state.items.forEach(item=>{
      if(Array.isArray(item.batches)) return;  // 已是新模型
      const pd=item.purchaseDate || item.productionDate || todayStr();
      const qty=Number(item.qty||item.stockQty||0);
      const batchId=dateToBatchId(pd);
      const batch={
        id: batchId,
        date: pd,
        quantity: Math.max(0, qty),
        unitPrice: Number(item.price||0),
        totalPrice: Number(item.totalPrice!=null?item.totalPrice:(Number(item.price||0)*Math.max(1,qty))),
        validity: item.validity || { value:365, unit:'day' },
        expiryDate: item.expiryDate || addYearsSafe(pd, 1),
        note: item.memo||''
      };
      item.batches=[batch];
      item.usings=[];
      // 保留原属性以兼容旧渲染，但实际计算走新字段
      changed=true;
    });
    if(changed){ try{ save(); console.log('[items] 数据模型已迁移到批次模型'); }catch(e){} }
  }
  function dateToBatchId(dateStr){
    // YYYY-MM-DD → YYYYMMDD入库
    if(!dateStr) return `${todayStr().replace(/-/g,'')}入库`;
    return `${dateStr.replace(/-/g,'')}入库`;
  }
  function isValidBatchId(id){
    return /^\d{8}入库$/.test(id||'');
  }
  // 同一日多次入库合并：把同一天的所有 batches 数量相加到一个 batch 上
  function mergeSameDayBatches(item){
    if(!item.batches||!item.batches.length) return;
    const map=new Map();
    item.batches.forEach(b=>{
      const key=b.date;
      if(map.has(key)){
        const cur=map.get(key);
        cur.quantity=(cur.quantity||0)+(b.quantity||0);
        // 加权平均价 = (cur.total + b.total) / (cur.qty + b.qty)
        const total=(cur.totalPrice||0)+(b.totalPrice||0);
        cur.totalPrice=total;
        cur.unitPrice=(cur.quantity>0)?(total/cur.quantity):0;
      } else {
        map.set(key, {...b});
      }
    });
    item.batches=[...map.values()];
    item.batches.sort((a,b)=>(a.date||'').localeCompare(b.date||''));
  }
  // 全量合并：遍历所有物品，把同一天的多个批次合并为一条（幂等，可在每次加载时调用）
  function consolidateAllBatches(){
    let changed=false;
    state.items.forEach(item=>{
      if(!Array.isArray(item.batches) || item.batches.length<2) return;
      const before=item.batches.length;
      mergeSameDayBatches(item);
      if(item.batches.length<before) changed=true;
    });
    if(changed){ try{ save(); console.log('[items] 已合并同一天的重复入库批次'); }catch(e){} }
  }

  /* ===== 批次相关计算 ===== */
  function getItemBatches(item){ return Array.isArray(item.batches)?item.batches:[]; }
  // 有效批次 = 未退库的批次（退库日期为空，或退库日期 > 今天）
  function getActiveBatches(item){
    const today=todayStr();
    return getItemBatches(item).filter(b=>!(b.retiredDate && b.retiredDate<=today));
  }
  function getItemUsings(item){ return Array.isArray(item.usings)?item.usings:[]; }
  function getItemTotalIn(item){
    return getItemBatches(item).reduce((s,b)=>s+(Number(b.quantity)||0),0);
  }
  function getItemTotalUsed(item){
    return getItemUsings(item).reduce((s,u)=>s+(Number(u.quantity)||0),0);
  }
  function getItemCurrentStock(item){
    return Math.max(0, getItemTotalIn(item)-getItemTotalUsed(item));
  }
  // 批次可用数量 = 该批次总数 - 该批次已取用数量
  function getBatchAvailableQty(item, batchId){
    const total=(getItemBatches(item).find(b=>b.id===batchId)||{}).quantity||0;
    const used=getItemUsings(item).filter(u=>u.batchId===batchId).reduce((s,u)=>s+(Number(u.quantity)||0),0);
    return Math.max(0, total-used);
  }
  // 入库天数：维护数据的当天为第 1 天。从最早批次日期到今天，含��日。
  function getItemHoldingDays(item){
    const bs=getItemBatches(item);
    if(!bs.length) return 0;
    const sorted=bs.map(b=>b.date).filter(Boolean).sort();
    const first=sorted[0];
    if(!first) return 0;
    const today=todayStr();
    const da=parseDate(first), db=parseDate(today);
    if(!da||!db) return 0;
    const d=Math.floor((db-da)/86400000);
    return Math.max(1, d+1);  // 维护当天为第 1 天
  }
  // 取所有有效批次（未退库）的并集有效期，得到日均成本（取最早批次与最近到期日的差距）
  function getItemDailyCost(item){
    const all=getActiveBatches(item);
    const bs=all.filter(b=>b.expiryDate);
    if(!bs.length) return 0;
    const minExp=bs.map(b=>b.expiryDate).sort()[0];
    const firstDate=all.map(b=>b.date).filter(Boolean).sort()[0];
    if(!firstDate || !minExp) return 0;
    const days=daysDiffInclusive(firstDate, minExp);
    if(days<=0) return 0;
    const total=all.reduce((s,b)=>s+(Number(b.totalPrice)||0),0);
    return total/days;
  }

  /* ===== 分类相关 ===== */
  function getSystemSecondary(pid){
    return (SYSTEM_SECONDARY[pid]||[]).map((name,idx)=>({
      id:`${pid}_sub_${idx}`,
      name,
      icon: SYSTEM_ICON_MAP[`${pid}:${name}`] || emojiFor(name),
      parentId: pid,
      system: true
    }));
  }
  function emojiFor(name){
    const map={
      '手机':'📱','笔记本电脑':'💻','台式电脑':'🖥','平板电脑':'📱','相机':'📷','镜头':'🔍','无人机':'🚁','NAS':'💾','路由器':'📡','键盘':'⌨','鼠标':'🖱','显示器':'🖥','打印机':'🖨','音箱':'🔊','耳机':'🎧','智能手表':'⌚','游戏机':'🎮','投影仪':'📽','电子书':'📖','充电宝':'🔋','硬盘':'💾','固态硬盘':'💾','U盘':'💾','存储卡':'💾','CPU':'🧠','显卡':'🎮','主板':'🔌','内存':'🧩','散热器':'🌀','风扇':'🌀','电源':'🔌','机箱':'🖥','音频设备':'🎙','智能眼镜':'👓','加湿器':'💧',
      'T恤':'👕','衬衫':'👔','毛衣':'🧶','卫衣':'🧥','外套':'🧥','羽绒服':'🧥','西装':'🤵','裤子':'👖','牛仔裤':'👖','半身裙':'👗','连衣裙':'👗','内衣':'👙','袜子':'🧦','运动鞋':'👟','靴子':'🥾','拖鞋':'🩴','雨鞋':'🌂','双肩包':'🎒','手提包':'👜','钱包':'👛','帽子':'🧢','围巾':'🧣','手套':'🧤','皮带':'🪢','其他':'📦',
      '洁面':'🧴','爽肤水':'🧴','精华':'🧴','乳液':'🧴','面霜':'🧴','防晒':'☀','面膜':'🧖','眼霜':'👁','彩妆':'💄','香水':'🌸','剃须刀':'🪒','洗发护发':'🧴','身体护理':'🧴','女性护理':'🩸','口腔健康':'🦷','时尚配饰':'💍',
      '冰箱':'🧊','洗衣机':'🧺','烘干机':'🌀','空调':'❄','电视':'📺','热水器':'🔥','油烟机':'🌪','洗碗机':'🍽','微波炉':'📟','电磁炉':'🔥','烤箱':'🔥','电饭煲':'🍚','空气炸锅':'🍟','咖啡机':'☕','破壁机':'🥤','吸尘器':'🧹','扫地机器人':'🤖','空气净化器':'🌬','加湿器':'💧','电风扇':'🌀','吹风机':'💨','洗地机':'🧽',
      '沙发':'🛋','床':'🛏','床垫':'🛏','桌子':'🪑','椅子':'🪑','柜子':'🗄','收纳':'📦','衣架':'👔','雨伞':'☂','厨具':'🍳','餐具':'🍽','清洁品':'🧽','洗衣用品':'🧺','茶几':'🪑','灯具':'💡','家纺':'🛏',
      '书籍':'📚','计算器':'🧮','书写用品':'✏','绘画工具':'🎨','办公用品':'📎','裁剪用品':'✂','胶粘用品':'🧴','收纳用品':'📦',
      '帐篷':'⛺','天幕':'⛺','睡袋':'🛌','徒步登山':'🥾','电器照明':'🔦','钓鱼用品':'🎣','球（拍）类':'🏸','健身器材':'🏋','滑雪用品':'🎿','游泳用品':'🏊','攀岩用品':'🧗','防护救生':'🛟',
      '婴儿车':'🍼','安全座椅':'💺','婴儿床':'🛏','奶瓶':'🍼','配方奶粉':'🥛','纸尿裤':'🧷','湿巾':'🧻','童装':'👶','童鞋':'👟','玩具':'🧸','绘本':'📖','孕妈用品':'🤰',
      '自行车':'🚲','电动车':'🛵','摩托车':'🏍','头盔':'⛑','行李箱':'🧳','颈枕':'💤','转换插头':'🔌',
      '药品':'💊','急救用品':'🩹','体温计':'🌡','血压计':'🩺','血糖仪':'🩸','体重秤':'⚖','按摩器械':'💆','眼镜':'👓','隐形眼镜':'👁','助听器':'🦻','医学美容':'💉','手术治疗':'🏥',
      '手办':'🧸','卡牌':'🃏','邮票':'💌','纪念币':'🪙','徽章':'🏅','模型':'🎁','乐器':'🎸','唱片':'💿','艺术品':'🖼',
      '宠物粮':'🍖','食盆':'🥣','猫砂':'🧹','宠物包':'🎒','牵引绳':'🦮','宠物玩具':'🎾','洗护用品':'🧴','宠物窝':'🏠','宠物服饰':'🎀',
      '油漆':'🎨','墙纸':'🖼','瓷砖':'⬜','地板':'🪵','水龙头':'🚰','花洒':'🚿','马桶':'🚽','水槽':'🚰','开关插座':'🔌','门锁':'🔒','家装工具':'🔧',
      '行车记录仪':'📹','车载支架':'📱','车载充电器':'🔌','车载吸尘器':'🧹','车载香薰':'🌸','座套':'💺','脚垫':'🟫','轮胎':'🛞','机油':'🛢','雨刮器':'🌧','电瓶':'🔋','洗车用品':'🧼',
      '车辆':'🚗','住宅':'🏠','公寓':'🏢','商铺':'🏪','车位':'🅿','其他资产':'📦',
      '课程培训':'📖','保险服务':'🛡','其他服务':'🤝',
      '游戏点卡':'🎮','会员订阅':'🎟','其他虚拟':'💾',
      '礼品':'🎁','票券':'🎫','其他物品':'📦'
    };
    return map[name]||'📦';
  }
  function allSystemCategories(){
    const list=[];
    SYSTEM_PRIMARY.forEach(p=>{
      list.push({...p, parentId:null, system:true});
      getSystemSecondary(p.id).forEach(c=>list.push(c));
    });
    return list;
  }
  function allCategories(){
    return [...allSystemCategories(), ...state.customCategories];
  }
  function getCategory(id){
    if(!id) return state.customCategories.find(c=>c.id===UNCATEGORIZED_ID);
    return allCategories().find(c=>c.id===id);
  }
  function getCategoryPath(id){
    const cat=getCategory(id);
    if(!cat) return { primaryId:UNCATEGORIZED_ID, secondaryId:null, primaryName:'未分类', secondaryName:null };
    if(cat.parentId){
      const parent=getCategory(cat.parentId);
      return { primaryId:parent.id, secondaryId:cat.id, primaryName:parent.name, secondaryName:cat.name };
    }
    return { primaryId:cat.id, secondaryId:null, primaryName:cat.name, secondaryName:null };
  }
  function customPrimaryCategories(){
    return state.customCategories.filter(c=>!c.parentId);
  }
  function customChildren(parentId){
    return state.customCategories.filter(c=>c.parentId===parentId);
  }

  /* ===== 物品分组与统计 ===== */
  function itemTotalPrice(item){
    if(item.totalPrice!=null && !isNaN(item.totalPrice)) return Number(item.totalPrice);
    return Number(item.price||0)*Math.max(1, Number(item.qty||1));
  }
  function itemDailyCost(item){
    if(!item.expiryDate) return 0;
    const days=daysDiffInclusive(item.productionDate, item.expiryDate);
    if(days<=0) return 0;
    return itemTotalPrice(item)/days;
  }
  function isRetired(item){
    const d=item.retiredDate;
    if(!d) return false;
    return d<=todayStr();
  }
  function groupItems(items){
    const map={};
    let totalAsset=0, avgDailyCost=0;
    items.forEach(item=>{
      // 使用新批次模型计算
      const batches=getItemBatches(item);
      const activeBatches=getActiveBatches(item);   // 仅未退库批次参与财务计算
      const totalIn=getItemTotalIn(item);
      const totalUsed=getItemTotalUsed(item);
      const currentStock=getItemCurrentStock(item);
      const totalPrice=activeBatches.reduce((s,b)=>s+(Number(b.totalPrice)||(Number(b.unitPrice||0)*Number(b.quantity||0))),0);
      const dailyCost=getItemDailyCost(item);
      if(activeBatches.length) avgDailyCost+=dailyCost;

      const path=getCategoryPath(item.categoryId);
      const key=`${item.name}|${path.primaryId}|${path.secondaryId||''}|${item.icon||'📦'}`;
      if(!map[key]){
        map[key]={
          key,
          name:item.name,
          icon:item.icon||'📦',
          primaryId:path.primaryId,
          secondaryId:path.secondaryId,
          primaryName:path.primaryName,
          secondaryName:path.secondaryName,
          // 新模型：总入库/当前库存/已取用
          totalIn:0,
          currentStock:0,
          totalUsed:0,
          // 兼容旧字段（别处不依赖，但保持以免破坏）
          qty:0,
          totalPrice:0,
          stockQty:0,
          inUseQty:0,
          scrappedQty:0,
          retiredQty:0,
          dailyCost:0,
          usageCount:0,
          purchaseDates:[],
          holdingDays:0,
          starred:false,
          pinned:false,
          items:[]
        };
      }
      const g=map[key];
      g.totalIn+=totalIn;
      g.currentStock+=currentStock;
      g.totalUsed+=totalUsed;
      // 旧字段映射（保持）
      g.qty+=totalIn;
      g.totalPrice+=totalPrice;
      g.stockQty+=currentStock;
      g.inUseQty+=totalUsed;
      g.scrappedQty+=0;  // 新模型无 scrapped
      g.retiredQty+=0;   // 新模型无 retired
      g.dailyCost+=dailyCost;
      g.usageCount+=getItemUsings(item).length;
      if(batches.length){
        batches.forEach(b=>g.purchaseDates.push(b.date));
      } else if(item.purchaseDate){
        g.purchaseDates.push(item.purchaseDate);
      }
      g.starred=g.starred||!!item.starred;
      g.pinned=g.pinned||!!item.pinned;
      g.items.push(item);
      totalAsset+=totalPrice;
    });
    const groups=Object.values(map);
    groups.forEach(g=>{
      // 购买均价：优先显示维护时填写的单价（item.avgPrice），不再用 totalPrice/qty 重算
      g.avgPrice=(g.items[0]&&g.items[0].avgPrice!=null&&g.items[0].avgPrice!=='')?Number(g.items[0].avgPrice):(g.qty?g.totalPrice/g.qty:0);
      g.purchaseDates.sort();
      g.purchaseDate=g.purchaseDates[0];
      // 入库天数：从最早批次到今天，维护当天为第1天
      if(g.items.length){
        const allBatches=[];
        g.items.forEach(it=>getItemBatches(it).forEach(b=>allBatches.push(b)));
        if(allBatches.length){
          const dates=allBatches.map(b=>b.date).filter(Boolean).sort();
          const first=dates[0];
          if(first){
            const da=parseDate(first), db=parseDate(todayStr());
            if(da&&db){
              const d=Math.floor((db-da)/86400000);
              g.holdingDays=Math.max(1, d+1);
            }
          }
        }
      }
      if(g.holdingDays<0) g.holdingDays=0;
    });
    return { groups, totalAsset, avgDailyCost, categoryCount:groups.length };
  }

  function applyFilterSort(groups){
    let arr=groups.slice();
    const f=state.settings.filters;
    if(f.categories && f.categories.length){
      arr=arr.filter(g=>f.categories.includes(g.primaryId)||(g.secondaryId&&f.categories.includes(g.secondaryId)));
    }
    if(f.statuses && f.statuses.length){
      arr=arr.filter(g=>f.statuses.some(s=>g[s+'Qty']>0));
    }
    if(f.starred) arr=arr.filter(g=>g.starred);

    const field=SORT_FIELDS.find(x=>x.key===state.settings.sortField)||SORT_FIELDS[0];
    const dir=state.settings.sortDir==='desc'?-1:1;
    arr.sort((a,b)=>{
      let av=a[field.key], bv=b[field.key];
      if(field.key==='price'){ av=a.totalPrice; bv=b.totalPrice; }
      if(field.key==='purchaseDate'){
        av=a.purchaseDate; bv=b.purchaseDate;
      }
      if(typeof av==='string'){
        return av.localeCompare(bv)*dir;
      }
      return (av-bv)*dir;
    });
    // 置顶物品优先展示（sort 稳定，仅按 pinned 二次排序，保持组内原顺序）
    arr.sort((a,b)=>(b.pinned?1:0)-(a.pinned?1:0));
    return arr;
  }

  function getExpiringItems(){
    const today=todayStr();
    return state.items.filter(it=>it.expiryDate).map(it=>{
      const delta=daysDiff(today, it.expiryDate);
      return { item:it, delta, expired:delta<0 };
    }).filter(x=>x.delta<=5).sort((a,b)=>a.delta-b.delta);
  }

  /* ===== 渲染总览 ===== */
  function renderOverview(){
    const { groups, totalAsset, avgDailyCost, categoryCount } = groupItems(state.items);
    const filtered=applyFilterSort(groups);

    const amountEl=$('#iTotalAsset');
    const avgEl=$('#iAvgDailyCost');
    const capEl=$('#iCapacityText');
    const capFill=$('#iCapacityFill');
    const eyeBtn=$('#iEyeBtn');

    if(eyeBtn){
      eyeBtn.innerHTML=state.settings.hideAmount? eyeClosedSvg():eyeOpenSvg();
      eyeBtn.classList.toggle('active', state.settings.hideAmount);
    }

    if(amountEl) amountEl.innerHTML=state.settings.hideAmount?hideMoney(totalAsset):`<span class="i-currency">¥</span>${totalAsset.toFixed(2)}`;
    if(avgEl) avgEl.textContent=state.settings.hideAmount?hideMoney(avgDailyCost):formatMoney(avgDailyCost);
    if(capEl) capEl.textContent=`${categoryCount} / 9999`;
    if(capFill) capFill.style.width=Math.min((categoryCount/9999)*100,100)+'%';

    const galleryBtn=$('#iGalleryBtn');
    if(galleryBtn){
      const isGrid=state.settings.viewMode==='grid';
      // 按钮文字表示「当前视图」：当前是网格则显示「画廊」，当前是清单则显示「清单」
      galleryBtn.innerHTML=`${isGrid?gridSvg():listSvg()} <span>${isGrid?'画廊':'清单'}</span>`;
    }

    renderExpiringModule();

    const container=$('#iItemsContainer');
    if(!container) return;
    if(filtered.length===0){
      container.innerHTML=emptyItemsHtml();
      return;
    }
    if(state.settings.viewMode==='grid'){
      container.innerHTML=`<div class="i-grid">${filtered.map(g=>gridCardHtml(g)).join('')}</div>`;
    }else{
      container.innerHTML=`<div class="i-list">${filtered.map(g=>listCardHtml(g)).join('')}</div>`;
    }
    bindItemCards(container);
  }

  function renderExpiringModule(){
    const el=$('#iExpiringModule');
    if(!el) return;
    const list=getExpiringItems();
    if(list.length===0){ el.style.display='none'; return; }
    el.style.display='block';
    const groups=groupItems(list.map(x=>x.item)).groups;
    // preserve delta info per item; for card, take first item
    const max5=list.slice(0,5);
    el.querySelector('.i-expiring-list').innerHTML=max5.map(x=>{
      const g=groups.find(gg=>gg.items.includes(x.item));
      return listCardHtml(g, x.expired, Math.abs(x.delta), x.delta<0);
    }).join('');
    bindItemCards(el);
  }

  function bindItemCards(ctx){
    $$('.i-grid-card, .i-list-card', ctx).forEach(card=>{
      card.addEventListener('click', e=>{
        if(e.target.closest('button, .i-star, .i-list-star')) return;
        const key=card.dataset.key;
        const { groups }=groupItems(state.items);
        const g=groups.find(gg=>gg.key===key);
        if(g) showDetail(g);
      });
    });
    // 五角星：暂不启用收藏功能，点击仅做居中提示
    $$('.i-star, .i-list-star', ctx).forEach(btn=>{
      btn.addEventListener('click', e=>{
        e.stopPropagation();
        e.preventDefault();
        showCenterToast('收藏功能暂未启用');
      });
    });
    // 置顶图标：最多置顶 10 个
    $$('.i-action-pin', ctx).forEach(btn=>{
      btn.addEventListener('click', e=>{
        e.stopPropagation();
        e.preventDefault();
        const key=btn.dataset.key;
        const { groups }=groupItems(state.items);
        const g=groups.find(gg=>gg.key===key);
        if(!g) return;
        togglePin(g);
      });
    });
  }

  /* ===== HTML 片段 ===== */
  function gridCardHtml(g){
    const batch=g.qty>1?`<span class="i-batch-badge">批量</span>`:'';
    return `
    <div class="i-grid-card ${g.pinned?'pinned':''}" data-key="${g.key}">
      ${batch}
      <div class="i-star ${g.starred?'active':''}" data-key="${g.key}">${starSvg()}</div>
      <div class="i-grid-icon">${renderIcon(g.icon, g.name)}</div>
      <div class="i-grid-name">${escapeHtml(g.name)}</div>
      <div class="i-grid-daily"><span>¥</span><strong>${g.dailyCost.toFixed(2)}</strong><span>/日</span></div>
      <div class="i-grid-actions">
        <button class="i-action-pin ${g.pinned?'active':''}" data-key="${g.key}" aria-label="置顶">${pinSvg()}</button>
      </div>
    </div>`;
  }
  function listCardHtml(g, forceExpired=false, days=0, expired=false){
    const isExpired=forceExpired||expired;
    const badge=isExpired?`<span class="i-expired-badge">已过期 ${days} 天</span>`:'';
    const batch=g.qty>1?`<span class="i-batch-badge">批量</span>`:'';
    const metaIcon = g.dailyCost>0? diamondSvg():clockSvg();
    return `
    <div class="i-list-card ${isExpired?'expired':''} ${g.pinned?'pinned':''}" data-key="${g.key}">
      ${batch}
      <div class="i-list-star ${g.starred?'active':''}" data-key="${g.key}">${starSvg()}</div>
      ${badge}
      <div class="i-list-top">
        <div class="i-list-left">${renderIcon(g.icon, g.name)}</div>
        <div class="i-list-right">
          <div class="i-list-name">${escapeHtml(g.name)}</div>
          <div class="i-list-daily">
            <span class="i-label">日均成本</span>
            <span class="i-currency">¥</span>
            <span class="i-amount">${g.dailyCost.toFixed(2)}</span>
            <span class="i-unit">/日</span>
          </div>
        </div>
      </div>
      <div class="i-list-divider"></div>
      <div class="i-list-stats">
        <div><strong>${g.stockQty}</strong>库存</div>
        <div><strong>${g.inUseQty}</strong>在用</div>
        <div><strong>${g.scrappedQty}</strong>报废</div>
        <div><strong>${g.retiredQty}</strong>退役</div>
      </div>
      <div class="i-list-footer">
        <div class="i-list-meta">${metaIcon} 买入均价 ${formatMoney(g.avgPrice)}，总价值 ${formatMoney(g.totalPrice)}</div>
        <div class="i-list-actions">
          <button class="i-action-pin ${g.pinned?'active':''}" data-key="${g.key}" aria-label="置顶">${pinSvg()}</button>
        </div>
      </div>
    </div>`;
  }
  function emptyItemsHtml(){
    return `
    <div class="i-empty">
      <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
      <p>还没有物品，点击右下角添加吧</p>
    </div>`;
  }
  function hideMoney(n){ return '¥ ****'; }

  /* ===== SVG ===== */
  function eyeOpenSvg(){ return `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`; }
  function eyeClosedSvg(){ return `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`; }
  function starSvg(){ return `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`; }
  function pinSvg(){ return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 17v5"/><path d="M9 3h6l-1 6 3.5 3.5V15H6.5v-2.5L10 9z"/></svg>`; }
  function folderSvg(){ return `<svg class="folder" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7a2 2 0 0 1 2-2h3.6a2 2 0 0 1 1.4.6L11.4 7H19a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>`; }
  function searchSvg(size){ return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.9-3.9"/></svg>`; }
  function plusSvg(size){ return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`; }
  function refreshSvg(size){ return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>`; }
  function archiveSvg(){ return `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`; }
  function shareSvg(){ return `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>`; }
  function listSvg(){ return `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>`; }
  function gridSvg(){ return `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`; }
  function diamondSvg(){ return `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>`; }
  function clockSvg(){ return `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`; }
  function backSvg(){ return `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>`; }
  function closeSvg(){ return `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`; }

  /* ===== 子页面路由 ===== */
  function showSubpage(name){
    $$('.i-subpage').forEach(p=>p.classList.remove('active'));
    const target=$('#i-subpage-'+name);
    if(target) target.classList.add('active');
    $('.main').scrollTop=0;
    if(name==='overview') renderOverview();
    if(name==='categories') renderCategoriesPage();
    if(name==='expiring') renderExpiringPage();
    if(name==='detail'){
      // 进入详情页时隐藏物品模块的悬浮添加按钮，避免与底部操作栏冲突
      const fab=$('.i-fab');
      if(fab) fab.style.display='none';
    } else {
      const fab=$('.i-fab');
      if(fab) fab.style.display='';
    }
    updateExpiringBadge();
  }

  // 侧边栏「到期清单」未读数量角标
  function updateExpiringBadge(){
    const el=$('#iNavExpiringBadge');
    if(!el) return;
    const n=getExpiringItems().length;
    if(n>0){ el.textContent=n>99?'99+':String(n); el.style.display='inline-flex'; }
    else el.style.display='none';
  }

  /* ===== 添加物品 ===== */
  function openAddItem(tab='single', editItem=null, presetCategory=null){
    temp.formTab=tab;
    temp.editId=editItem?editItem.id:null;
    temp.selectedCategory=presetCategory||(editItem?editItem.categoryId:null);
    temp.selectedIcon=editItem?(editItem.icon||'📦'):'📦';

    // reset form
    $$('#i-subpage-add input, #i-subpage-add textarea').forEach(el=>el.value='');
    $$('#i-subpage-add .i-switch').forEach(el=>el.classList.remove('on'));
    $('#iFormTabSingle').classList.toggle('active', tab==='single');
    $('#iFormTabBatch').classList.toggle('active', tab==='batch');
    $('#iSingleFields').style.display=tab==='single'?'block':'none';
    $('#iBatchFields').style.display=tab==='batch'?'block':'none';

    $('#iProductionDate').value=todayStr();
    $('#iPurchaseDate').value=todayStr();
    $('#iBatchProductionDate').value=todayStr();
    $('#iBatchPurchaseDate').value=todayStr();
    $('#iQty').value='1';
    $('#iBatchUnitPrice').value='';
    $('#iBatchTotalPrice').value='';

    if(editItem){
      // 物品级字段：编辑时保留并可修改（分类/图标已在外部设置）
      $('#iName').value=editItem.name;
      $('#iExpectedDaily').value=editItem.expectedDaily||'';
      $('#iRetireDate').value=editItem.retireDate||'';
      $('#iUsageCount').value=editItem.usageCount||'';
      $('#iMaintenance').value=editItem.maintenanceTotal||'';
      $('#iLocation').value=editItem.location||'';
      $('#iMemo').value=editItem.memo||'';
      $('#iCalcTime').checked=(editItem.calcMode||'time')==='time';
      $('#iCalcFreq').checked=editItem.calcMode==='freq';
      $('#iCalcNone').checked=editItem.calcMode==='none';
      $('#iBatchName').value=editItem.name;
      $('#iBatchLocation').value=editItem.location||'';
      $('#iBatchMemo').value=editItem.memo||'';
      if(editItem.autoTakeOne) $('#iAutoTakeOne').classList.add('on');
      // 批次相关字段（购买/生产日期、数量、单价、有效期）【不预填旧值】：
      // 编辑语义 = 追加一条新入库批次，避免覆盖历史批次。
    }else{
      $('#iCalcTime').checked=true;
    }
    updateCategoryTrigger();
    updateIconBtn();
    showSubpage('add');
  }

  function updateCategoryTrigger(){
    const cat=getCategory(temp.selectedCategory);
    // 未选择时显示占位文案，选择后显示一级分类名（单个/批量两处同步）
    const html=cat
      ? escapeHtml(getCategoryPath(cat.id).primaryName)
      : '<span class="i-placeholder">请选择分类</span>';
    const single=$('#iCategoryTrigger .i-value');
    const batch=$('#iBatchCategoryTrigger .i-value');
    if(single) single.innerHTML=html;
    if(batch) batch.innerHTML=html;
  }
  function updateIconBtn(){
    const ic=temp.selectedIcon||'📦';
    // 图标可能是 PNG 路径（系统分类图标）或 emoji，路径时渲染 <img>
    const html=(ic.includes('/')||ic.startsWith('data:'))
      ? `<img src="${escapeHtml(ic)}" style="width:68%;height:68%;object-fit:contain" alt="">`
      : escapeHtml(ic);
    $('#iIconBtn').innerHTML=html;
    $('#iBatchIconBtn').innerHTML=html;
  }

  function saveItemForm(){
    const isBatch=temp.formTab==='batch';
    const name=isBatch?$('#iBatchName').value.trim():$('#iName').value.trim();
    if(!name){ showToast('请输入物品名称'); return; }
    if(!temp.selectedCategory){ showToast('请选择分类'); return; }

    let item={};
    if(temp.editId) item=state.items.find(it=>it.id===temp.editId);
    if(!item) item={ id:uuid(), createdAt:new Date().toISOString() };

    item.name=name;
    item.icon=temp.selectedIcon||'📦';
    item.categoryId=temp.selectedCategory;
    item.purchaseDate=isBatch?$('#iBatchPurchaseDate').value:$('#iPurchaseDate').value;
    item.productionDate=isBatch?$('#iBatchProductionDate').value:$('#iProductionDate').value;
    item.location=isBatch?$('#iBatchLocation').value.trim():$('#iLocation').value.trim();
    item.memo=isBatch?$('#iBatchMemo').value.trim():$('#iMemo').value.trim();
    // 任务5/6：退库日期（选填）—— 已维护且日期已过则不计入总资产/平均每日成本
    item.retiredDate=isBatch?($('#iBatchRetireDate').value||''):($('#iRetireDate').value||'');
    item.updatedAt=new Date().toISOString();

    const isEdit=!!temp.editId;
    // 新批次模型：构造本次入库批次
    let qty=1, price=0, totalPrice=0, expiryDate='', note=item.memo||'';
    if(isBatch){
      qty=Math.max(0, parseInt($('#iQty').value)||0);
      if(qty<=0){ showToast('请输入入库数量'); return; }   // 编辑/批量均需有效数量
      price=Number($('#iBatchUnitPrice').value)||0;
      totalPrice=Number($('#iBatchTotalPrice').value)||(qty*price);
      expiryDate=$('#iBatchExpiryDate').value;
      if(!expiryDate){ showToast('请填写有效期'); return; }
    }else{
      qty=1;
      price=Number($('#iPrice').value)||0;
      totalPrice=price;
      expiryDate=$('#iExpiryDate').value;
      if(!expiryDate){ showToast('请填写有效期'); return; }
    }

    const batchId=dateToBatchId(item.purchaseDate);
    const newBatch={
      id: batchId,
      date: item.purchaseDate,
      quantity: qty,
      unitPrice: price,
      totalPrice: totalPrice,
      validity: { value:365, unit:'day' },
      expiryDate: expiryDate,
      retiredDate: isBatch ? '' : (item.retiredDate||''),
      note: note
    };

    if(isEdit){
      // 编辑模式：保留历史批次与取用记录，仅追加本次入库批次（同日自动合并）
      if(!Array.isArray(item.batches)) item.batches=[];
      item.batches.push(newBatch);
      mergeSameDayBatches(item);
      if(!Array.isArray(item.usings)) item.usings=[];   // 保留历史取用，不重置
      // 兼容字段：基于合并后的批次重算，且不破坏库存/取用计数
      item.qty=getItemTotalIn(item);
      item.price=price;
      item.avgPrice=price;                               // 购买均价 = 本次填写单价，不重算
      item.totalPrice=getItemBatches(item).reduce((s,b)=>s+(Number(b.totalPrice)||0),0);
      item.expiryDate=expiryDate;
      // stockQty/inUseQty/scrappedQty/retiredQty 由专属入库/取用按钮维护，编辑时保持不变
    }else{
      // 新增模式：初始化物品
      item.batches=[newBatch];
      item.usings=[];
      item.qty=qty;
      item.price=price;
      item.avgPrice=price;
      item.totalPrice=totalPrice;
      item.expiryDate=expiryDate;
      item.stockQty=qty;
      item.inUseQty=0;
      item.scrappedQty=0;
      item.retiredQty=0;
    }

    if(isEdit){
      const idx=state.items.findIndex(it=>it.id===temp.editId);
      state.items[idx]=item;
    }else{
      state.items.push(item);
    }
    item.updatedAt=new Date().toISOString();
    save();
    showToast(temp.editId?'已保存':'已添加');
    showSubpage('overview');
  }

  /* ===== 详情页 ===== */
  let currentDetailGroup=null;
  function formatDateDot(s){
    if(!s) return '-';
    const d=parseDate(s);
    if(!d) return s.slice(0,10).replace(/-/g,'.');
    return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`;
  }
  function formatIsoDot(iso){
    if(!iso) return '-';
    const d=new Date(iso);
    if(isNaN(d)) return '-';
    return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`;
  }
  function statusText(g){
    if(g.stockQty>0) return '现役中';
    if(g.inUseQty>0) return '使用中';
    if(g.scrappedQty>0) return '已报废';
    if(g.retiredQty>0) return '已退役';
    return '未入库';
  }
  function renderDetailHeroIcon(g){
    const el=$('#iDetailHeroIcon');
    if(!el) return;
    el.innerHTML='';
    if(g.icon && (g.icon.includes('/')||g.icon.startsWith('data:'))){
      el.innerHTML=`<img src="${g.icon}" alt="${escapeHtml(g.name)}" loading="lazy" onerror="this.style.display='none';this.parentElement.textContent='📦'">`;
    } else {
      el.textContent=g.icon||'📦';
    }
  }
  function showDetail(g){
    currentDetailGroup=g;
    const item=g.items[0];
    const path=getCategoryPath(item.categoryId);
    const currentStock=g.currentStock||0;
    const totalIn=g.totalIn||0;
    const totalUsed=g.totalUsed||0;
    const usagePct=totalIn>0?((totalUsed/totalIn)*100).toFixed(1):'0.0';

    renderDetailHeroIcon(g);
    // "批量"角标：多个批次或总入库量 > 1 才显示
    $('#iDetailBatch').textContent='批量';
    $('#iDetailBatch').classList.toggle('i-hide', getItemBatches(item).length<=1 && totalIn<=1);
    // 底部「入库」按钮：与「批量」角标同条件 —— 单个物品(单批次且总入库≤1)隐藏，批量物品显示
    $('#iDetailRestockBtn').classList.toggle('i-hide', getItemBatches(item).length<=1 && totalIn<=1);
    const starBtn=$('#iDetailStar');
    starBtn.classList.toggle('active', !!g.starred);
    // 收藏功能暂未启用：点击仅做居中提示
    starBtn.onclick=()=>{ showCenterToast('收藏功能暂未启用'); };
    $('#iDetailHeroName').textContent=g.name;
    $('#iDetailHeroDaily').textContent=g.dailyCost.toFixed(2);

    $('#iDetailStock').textContent=currentStock;
    $('#iDetailTotalIn').textContent=totalIn;
    $('#iDetailUsed').textContent=totalUsed;

    $('#iDetailDays').textContent=g.holdingDays;
    $('#iDetailUsageText').textContent=`已使用 ${usagePct}%`;
    $('#iDetailUsageEnd').textContent=`${(100-Number(usagePct)).toFixed(1)}%`;
    $('#iDetailProgressFill').style.width=Math.min(100, Number(usagePct))+'%';

    // 库存档案明细
    $('#iDetailAvgPrice').textContent=formatMoney(g.avgPrice);
    $('#iDetailTotalPrice').textContent=formatMoney(g.totalPrice);
    $('#iDetailTotalQty').textContent=totalIn+' 件';
    $('#iDetailInUse').textContent=totalUsed+' 件';
    $('#iDetailStatus').textContent=currentStock>0?'现役中':(totalUsed>0?'已用尽':'未入库');
    // 「首次入库时间」= 最早入库批次的日期（第一次填写的入库日期），纯展示，不再点击选批次
    const firstBatchDate=getItemBatches(item).map(b=>b.date).filter(Boolean).sort()[0];
    $('#iDetailFirstDate').textContent=firstBatchDate?formatDateDot(firstBatchDate):'--';
    $('#iDetailCategory').textContent=path.secondaryName?`${path.primaryName} > ${path.secondaryName}`:path.primaryName;
    $('#iDetailLocation').textContent=item.location||'-';
    // 「添加时间」保持可点击选批次（v28 行为）
    $('#iDetailCreated').textContent='选择批次';
    $('#iDetailUpdated').textContent=formatIsoDot(item.updatedAt);
    // 退库日期：单个物品显示一行（取 item.retiredDate）；批量物品显示两行（选批次→取该批次退库日期）
    const isSingle = getItemBatches(item).length<=1 && totalIn<=1;
    if(isSingle){
      $('#iDetailRetiredSingleRow').style.display='';
      $('#iDetailRetiredBatchRow').style.display='none';
      $('#iDetailRetiredBatchDateRow').style.display='none';
      $('#iDetailRetiredSingle').textContent=item.retiredDate?formatDateDot(item.retiredDate):'--';
    }else{
      $('#iDetailRetiredSingleRow').style.display='none';
      $('#iDetailRetiredBatchRow').style.display='';
      $('#iDetailRetiredBatchDateRow').style.display='';
      $('#iDetailRetiredBatch').textContent='选择批次';
      $('#iDetailRetiredBatch').dataset.bid='';
      $('#iDetailRetiredBatchDate').textContent='选择日期';
    }
    // 任务4：库存档案“添加时间”可点击→选择批次查看入库日期（首次入库时间已改为纯展示）
    bindBatchDateRow('#iDetailCreatedRow', 'created');
    bindBatchDateRow('#iDetailRetiredBatchRow', 'retired');

    // 底部操作栏 → 接入新弹窗
    $$('#iDetailBottomActions .i-detail-btns').forEach(btn=>{
      btn.onclick=()=>{
        const action=btn.dataset.action;
        if(action==='stock'){ openRestockModal(item); }
        else if(action==='use'){ openUseModal(item); }
        else if(action==='edit'){ openEditItem(item); }
        else if(action==='share'){ showShareUnavailable(); }
        else if(action==='delete'){ confirmDeleteItem(item, g); }
      };
    });

    showSubpage('detail');
    $('.main').scrollTop=0;
  }
  // ===== 任务4/6：库存档案卡片“添加时间/退库日期”→ 选择批次 =====
  let batchDateTargetRow=null, batchDateSelectedId=null, batchDateMode='created';
  function bindBatchDateRow(sel, mode){
    const el=$(sel);
    if(!el || el._bd) return;
    el.dataset.mode=mode||'created';
    el.addEventListener('click',()=>openBatchDatePicker(el));
    el._bd=true;
  }
  function openBatchDatePicker(rowEl){
    if(!currentDetailGroup) return;
    batchDateMode=rowEl.dataset.mode||'created';
    batchDateTargetRow=rowEl;
    batchDateSelectedId=null;
    const all=[];
    currentDetailGroup.items.forEach(it=>getItemBatches(it).forEach(b=>all.push(b)));
    all.sort((a,b)=>(b.date||'').localeCompare(a.date||''));
    // 批次清单只显示唯一标识符（如 20260904入库）
    $('#iBatchDateList').innerHTML=all.map(b=>`
      <div class="i-bs-batch-item" data-id="${escapeHtml(b.id)}">
        <div class="i-bs-batch-top"><span class="i-bs-batch-name">${escapeHtml(b.id)}</span></div>
      </div>`).join('') || '<div class="i-empty"><p>暂无入库批次</p></div>';
    $$('#iBatchDateList .i-bs-batch-item').forEach(el=>{
      el.addEventListener('click',()=>{
        $$('#iBatchDateList .i-bs-batch-item').forEach(x=>x.classList.remove('active'));
        el.classList.add('active');
        batchDateSelectedId=el.dataset.id;
      });
    });
    openModal('iBatchDateModal');
    hideTabbar(true);
  }
  function bindBatchDateEvents(){
    $('#iBatchDateCancel')?.addEventListener('click',()=>{ closeModal('iBatchDateModal'); hideTabbar(false); });
    $('#iBatchDateConfirm')?.addEventListener('click',()=>{
      if(!batchDateSelectedId || !batchDateTargetRow) return;
      const all=[];
      currentDetailGroup.items.forEach(it=>getItemBatches(it).forEach(b=>all.push(b)));
      const b=all.find(x=>x.id===batchDateSelectedId);
      if(!b) return;
      if(batchDateMode==='retired'){
        // 退库日期选择批次：第一行显示唯一标识符，第二行显示该批次退库日期
        $('#iDetailRetiredBatch').textContent=b.id;
        $('#iDetailRetiredBatch').dataset.bid=b.id;
        $('#iDetailRetiredBatchDate').textContent=b.retiredDate?formatDateDot(b.retiredDate):'选择日期';
      }else{
        const val=batchDateTargetRow.querySelector('.i-detail-row-value');
        if(val) val.textContent=formatDateDot(b.date);
      }
      closeModal('iBatchDateModal'); hideTabbar(false);
    });
  }
  function confirmDeleteItem(item, g){
    if(!confirm(`确定删除「${item.name}」？该操作会从数据库中彻底删除该物品的所有批次和取用记录，手机端和电脑端的数据都会同步删除。`)) return;
    deleteItems(g);
    showSubpage('overview');
    renderOverview();
  }
  function showShareUnavailable(){
    // 分享按钮：提示该功能暂未启用
    let modal=document.getElementById('iShareModal');
    if(!modal){
      modal=document.createElement('div');
      modal.className='i-modal';
      modal.id='iShareModal';
      modal.innerHTML=`
        <div class="i-modal-card i-share-modal-card">
          <div class="i-modal-icon">🔗</div>
          <h3>该功能暂未��用</h3>
          <p>分享功能正在开发中，敬请期待</p>
          <button class="i-btn-primary" data-close-modal="iShareModal" style="width:100%">我知道了</button>
        </div>`;
      document.body.appendChild(modal);
      modal.addEventListener('click',e=>{ if(e.target===modal || e.target.closest('[data-close-modal]')) modal.classList.remove('show'); });
    }
    modal.classList.add('show');
  }
  function changeStatus(g, type){
    if(type==='stock'){
      // 入库：从第一个有退役/报废/在用的记录里回退 1 件到库存，或新增一件虚拟库存
      const target=g.items.find(it=((it.retiredQty||0)+(it.scrappedQty||0)+(it.inUseQty||0))>0);
      if(target){
        if(target.inUseQty>0){ target.inUseQty-=1; target.stockQty=(target.stockQty||0)+1; }
        else if(target.scrappedQty>0){ target.scrappedQty-=1; target.stockQty=(target.stockQty||0)+1; }
        else if(target.retiredQty>0){ target.retiredQty-=1; target.stockQty=(target.stockQty||0)+1; }
      } else {
        // 没有可回退状态时，给首个物品加 1 库存
        const first=g.items[0];
        first.qty=(first.qty||0)+1;
        first.stockQty=(first.stockQty||0)+1;
      }
    } else {
      // 取用/报废/退役：从库存中消耗 1 件
      const target=g.items.find(it=((it.stockQty||0))>0);
      if(!target){ showToast('库存不足'); return; }
      target.stockQty-=1;
      if(type==='use') target.inUseQty=(target.inUseQty||0)+1;
      if(type==='scrap') target.scrappedQty=(target.scrappedQty||0)+1;
      if(type==='retire') target.retiredQty=(target.retiredQty||0)+1;
    }
    save();
    showToast('状态已更新');
    showDetail(g);
    renderOverview();
  }
  function deleteItems(g){
    g.items.forEach(it=>{ if(it && it.id && !TOMB.includes(it.id)) TOMB.push(it.id); });
    state.items=state.items.filter(it=>!g.items.includes(it));
    save();
  }

  /* ===== 分类管理 ===== */
  function renderCategoriesPage(){
    const tab=state.settings.catTab||'my';
    $('#iCatTabMy').classList.toggle('active', tab==='my');
    $('#iCatTabSys').classList.toggle('active', tab==='sys');
    $('#iAddPrimaryBtn').style.display=tab==='my'?'flex':'none';

    if(tab==='my'){
      $('#iMyCategories').style.display='block';
      $('#iSysView').style.display='none';
      renderMyCategories();
    }else{
      $('#iMyCategories').style.display='none';
      $('#iSysView').style.display='block';
      renderSystemCategories();
    }
  }
  /* ===== 分类搜索 ===== */
  // 读取搜索框关键词
  function getCatSearchTerm(){
    const el=$('#iCatSearch');
    return el ? (el.value||'').trim() : '';
  }
  // 模糊匹配：先做包含匹配，再做「按顺序出现」的子序列匹配
  function fuzzyMatch(text, term){
    if(!term) return true;
    const t=String(text||'').toLowerCase();
    const q=String(term).toLowerCase();
    if(!q) return true;
    if(t.indexOf(q)!==-1) return true;
    let i=0;
    for(const ch of t){
      if(ch===q[i]) i++;
      if(i>=q.length) return true;
    }
    return false;
  }
  // 「未找到分类」空状态卡片（我的分类 / 系统分类共用）
  function noFoundHtml(term, mode){
    const kw=escapeHtml(term);
    const isMy=(mode==='my');
    return `
    <div class="i-cat-nofound">
      <div class="i-cat-nofound-icon">${folderSvg()}<span class="lens">${searchSvg(13)}</span></div>
      <div class="i-cat-nofound-title">未找到相关分类</div>
      <div class="i-cat-nofound-sub">没有匹配「<em>${kw}</em>」的分类<br>${isMy?'换个关键词试试，或直接用该名称新建分类':'换个关键词，或切换上方的一级分类'}</div>
      ${isMy
        ? `<button class="i-cat-nofound-btn" id="iCatNoFoundAdd" data-name="${kw}">${plusSvg(16)} 新增「${kw}」为一级分类</button>`
        : `<button class="i-cat-nofound-btn" id="iCatNoFoundClear">${refreshSvg(16)} 清空搜索，查看全部系统分类</button>`}
    </div>`;
  }
  // 点击搜索按钮 / 回车：按当前 tab 重新过滤
  function runCatSearch(){
    const tab=state.settings.catTab||'my';
    if(tab==='sys') renderSystemCategories();
    else renderMyCategories();
  }

  function renderMyCategories(){
    const term=getCatSearchTerm();
    const list=$('#iMyCategories');
    const primaries=customPrimaryCategories().filter(p=>{
      if(p.id===UNCATEGORIZED_ID) return false;
      if(!term) return true;
      return fuzzyMatch(p.name, term) || customChildren(p.id).some(c=>fuzzyMatch(c.name, term));
    });

    if(primaries.length===0){
      if(term){
        list.innerHTML=noFoundHtml(term, 'my');
        const addBtn=$('#iCatNoFoundAdd');
        if(addBtn){
          addBtn.addEventListener('click',()=>{
            addPrimaryCategory(addBtn.dataset.name||term);
            const el=$('#iCatSearch'); if(el) el.value='';
            showToast('已新增分类');
          });
        }
      }else{
        list.innerHTML=`<div class="i-empty"><p>暂无自定义分类，点击上方按钮新增</p></div>`;
      }
      return;
    }
    list.innerHTML=primaries.map(p=>{
      const children=customChildren(p.id).filter(c=>!term || fuzzyMatch(c.name, term) || fuzzyMatch(p.name, term));
      const expanded=temp.expandedCats.has(p.id);
      return `
      <div class="i-cat-group">
        <div class="i-cat-group-head" data-id="${p.id}">
          <div>
            <span class="i-cat-group-title">${escapeHtml(p.name)}</span>
            <span class="i-cat-group-count">${children.length} 个子分类</span>
          </div>
          <div class="i-cat-group-actions">
            <button class="i-edit-primary" data-id="${p.id}" title="编辑">✏️</button>
            <button class="i-delete-primary" data-id="${p.id}" title="删除">🗑</button>
            <button class="i-add-child" data-id="${p.id}" title="添加子分类">➕</button>
            <button class="i-toggle-expand" data-id="${p.id}" title="展开/收起">${expanded?'⌃':'⌄'}</button>
          </div>
        </div>
        ${expanded?`
        <div class="i-cat-children">
          ${children.length?children.map(c=>`
            <div class="i-cat-child">
              <div class="i-cat-child-info">${renderIcon(c.icon||'📁', c.name, 'i-cat-child-icon')}${escapeHtml(c.name)}</div>
              <div class="i-cat-group-actions">
                <button class="i-edit-child" data-id="${c.id}" title="编辑">✏️</button>
                <button class="i-delete-child i-delete" data-id="${c.id}" title="删除">🗑</button>
              </div>
            </div>
          `).join(''):`
            <div class="i-cat-empty">
              <p>暂无二级分类</p>
              <button class="i-btn i-btn-primary i-add-child" data-id="${p.id}">+ 添加子分类</button>
            </div>
          `}
        </div>`:''}
      </div>`;
    }).join('');

    bindCategoryEvents(list);
  }
  function bindCategoryEvents(ctx){
    $$('.i-cat-group-head', ctx).forEach(h=>{
      h.addEventListener('click', e=>{
        if(e.target.closest('button')) return;
        const id=h.dataset.id;
        if(temp.expandedCats.has(id)) temp.expandedCats.delete(id); else temp.expandedCats.add(id);
        renderMyCategories();
      });
    });
    $$('.i-toggle-expand', ctx).forEach(b=>b.addEventListener('click', e=>{ e.stopPropagation(); const id=b.dataset.id; if(temp.expandedCats.has(id)) temp.expandedCats.delete(id); else temp.expandedCats.add(id); renderMyCategories(); }));
    $$('.i-edit-primary', ctx).forEach(b=>b.addEventListener('click', e=>{ e.stopPropagation(); openTextModal('编辑一级分类', getCategory(b.dataset.id).name, val=>{ updateCategory(b.dataset.id, val); }); }));
    $$('.i-delete-primary', ctx).forEach(b=>b.addEventListener('click', e=>{ e.stopPropagation(); deletePrimary(b.dataset.id); }));
    $$('.i-add-child', ctx).forEach(b=>b.addEventListener('click', e=>{ e.stopPropagation(); openChildModal(b.dataset.id); }));
    $$('.i-edit-child', ctx).forEach(b=>b.addEventListener('click', e=>{ e.stopPropagation(); const cat=getCategory(b.dataset.id); openIconTextModal('编辑子分类', cat.name, cat.icon, (name,icon)=>{ updateCategory(b.dataset.id, name, icon); }); }));
    $$('.i-delete-child', ctx).forEach(b=>b.addEventListener('click', e=>{ e.stopPropagation(); if(confirm('删除后归属将变为「未分类」')){ deleteCategory(b.dataset.id); } }));
  }

  function renderSystemCategories(){
    const selected=state.settings.sysCatChip||'all';
    const chipRow=$('#iSysChipRow');
    chipRow.innerHTML=[{id:'all',name:'全部',icon:''},...SYSTEM_PRIMARY].map(p=>
      `<button class="i-chip ${selected===p.id?'active':''}" data-id="${p.id}">${p.name}</button>`
    ).join('');
    enableDragScroll(chipRow);
    $$('#iSysChipRow .i-chip').forEach(btn=>{
      btn.addEventListener('click',()=>{ state.settings.sysCatChip=btn.dataset.id; save(); renderSystemCategories(); });
    });

    let list=[];
    if(selected==='all'){
      SYSTEM_PRIMARY.forEach(p=>{
        getSystemSecondary(p.id).forEach(c=>list.push({...c, _pname:p.name}));
      });
    }else{
      const pname=(SYSTEM_PRIMARY.find(p=>p.id===selected)||{}).name||'';
      list=getSystemSecondary(selected).map(c=>({...c, _pname:pname}));
    }
    // 模糊搜索：同时匹配二级分类名与所属一级分类名
    const term=getCatSearchTerm();
    if(term) list=list.filter(c=>fuzzyMatch(c.name, term)||fuzzyMatch(c._pname||'', term));

    if(list.length===0){
      // 横向一级分类卡片保留，仅在其下方显示「未找到」卡片（与我的分类同款版式）
      $('#iSysGrid').innerHTML=noFoundHtml(term||'当前分类', 'sys');
      const clearBtn=$('#iCatNoFoundClear');
      if(clearBtn){
        clearBtn.addEventListener('click',()=>{
          const el=$('#iCatSearch');
          if(el){ el.value=''; }
          state.settings.sysCatChip='all';
          save();
          renderSystemCategories();
        });
      }
      return;
    }
    $('#iSysGrid').innerHTML=list.map(c=>`
      <div class="i-sys-card" data-id="${c.id}">
        <div class="i-sys-card-icon">${renderIcon(c.icon, c.name)}</div>
        <div class="i-sys-card-name">${escapeHtml(c.name)}</div>
      </div>
    `).join('');
    $$('#iSysGrid .i-sys-card').forEach(card=>{
      card.addEventListener('click',()=>{
        openAddItem('single', null, card.dataset.id);
      });
    });
  }

  function openChildModal(parentId){
    openIconTextModal('新增二级分类','','📁',(name,icon)=>{ addChildCategory(parentId, name, icon); });
  }

  function addPrimaryCategory(name){
    const id=uuid();
    state.customCategories.push({ id, name:name.trim(), icon:'📁', system:false });
    // 新增后自动展开，直接露出「添加子分类」区域，无需再点加号
    temp.expandedCats.add(id);
    save(); renderCategoriesPage();
  }
  function addChildCategory(parentId, name, icon){
    state.customCategories.push({ id:uuid(), parentId, name:name.trim(), icon:icon||'📁', system:false });
    // 保持父级展开，方便连续添加
    temp.expandedCats.add(parentId);
    save(); renderCategoriesPage();
  }
  function updateCategory(id, name, icon){
    const cat=state.customCategories.find(c=>c.id===id);
    if(!cat) return;
    cat.name=name.trim();
    if(icon!=null) cat.icon=icon;
    save(); renderCategoriesPage();
  }
  function deleteCategory(id){
    // move items with this category to uncategorized
    state.items.forEach(it=>{ if(it.categoryId===id) it.categoryId=UNCATEGORIZED_ID; });
    state.customCategories=state.customCategories.filter(c=>c.id!==id);
    save(); renderCategoriesPage(); renderOverview();
  }
  function deletePrimary(id){
    const children=customChildren(id);
    if(children.length){
      if(!confirm('该分类下有子分类，删除后子分类及关联物品将归为「未分类」')) return;
      children.forEach(c=>{ state.items.forEach(it=>{ if(it.categoryId===c.id) it.categoryId=UNCATEGORIZED_ID; }); });
    }
    state.items.forEach(it=>{ if(it.categoryId===id) it.categoryId=UNCATEGORIZED_ID; });
    state.customCategories=state.customCategories.filter(c=>c.id!==id && c.parentId!==id);
    save(); renderCategoriesPage(); renderOverview();
  }

  /* ===== 到期清单页 ===== */
  function renderExpiringPage(){
    const today=todayStr();
    const list=state.items.filter(it=>it.expiryDate).map(it=>{
      const delta=daysDiff(today, it.expiryDate);
      return { item:it, delta };
    }).sort((a,b)=>a.delta-b.delta);
    const soon=list.filter(x=>x.delta>=0);
    const expired=list.filter(x=>x.delta<0);
    $('#iExpiringSummary').textContent=`${soon.length} 件即将到期 / ${expired.length} 件已过期`;
    const groups=groupItems(list.map(x=>x.item)).groups;
    $('#iExpiringList').innerHTML=list.map(x=>{
      const g=groups.find(gg=>gg.items.includes(x.item));
      return listCardHtml(g, x.delta<0, Math.abs(x.delta), x.delta<0);
    }).join('') || `<div class="i-empty"><p>暂无到期物品</p></div>`;
    bindItemCards($('#iExpiringList'));
  }

  /* ===== 取用库存 弹窗 ===== */
  let useTargetItem=null;
  let useSelectedBatch=null;
  let useSelectedDate=null;
  /* ===== 补货入库（仅批量物品档案页显示） ===== */
  let restockTargetItem=null;
  function openRestockModal(item){
    restockTargetItem=item;
    temp.restockDate=todayStr();
    $('#iRestockSub').textContent=`为「${item.name}」新增一个入库批次`;
    $('#iRestockDate').textContent=formatDateDot(temp.restockDate);
    $('#iRestockExpiry').textContent='请选择';
    $('#iRestockQty').value='';
    $('#iRestockUnitPrice').value='';
    $('#iRestockTotalPrice').value='';
    $('#iRestockNote').value='';
    $('#iRestockNoteCount').textContent='0';
    openModal('iRestockModal');
    hideTabbar(true);
  }
  function bindRestockEvents(){
    $('#iRestockDateRow')?.addEventListener('click',()=>{
      openDatePicker('#iRestockDate', temp.restockDate||todayStr());
    });
    $('#iRestockExpiryRow')?.addEventListener('click',()=>{
      if(!$('#iRestockDate').value){ showToast('请先选择入库日期'); return; }
      openExpiryPicker('#iRestockExpiry', $('#iRestockDate').value);
    });
    $('#iRestockNote')?.addEventListener('input', e=>{ $('#iRestockNoteCount').textContent=e.target.value.length; });
    $('#iRestockCancel')?.addEventListener('click',()=>{ closeModal('iRestockModal'); hideTabbar(false); });
    $('#iRestockConfirm')?.addEventListener('click', saveRestock);
  }
  function saveRestock(){
    if(!restockTargetItem) return;
    const qty=Number($('#iRestockQty').value)||0;
    if(qty<=0){ showToast('请输入入库数量'); return; }
    const expiry=$('#iRestockExpiry').value;
    if(!expiry || expiry==='请选择'){ showToast('请选择有效期'); return; }
    const price=Number($('#iRestockUnitPrice').value)||0;
    const total=Number($('#iRestockTotalPrice').value)||(qty*price);
    const date=temp.restockDate||todayStr();
    const item=restockTargetItem;
    if(!Array.isArray(item.batches)) item.batches=[];
    item.batches.push({
      id: dateToBatchId(date),
      date: date,
      quantity: Math.round(qty*10)/10,
      unitPrice: price,
      totalPrice: total,
      validity: { value:365, unit:'day' },
      expiryDate: expiry,
      retiredDate: '',
      note: $('#iRestockNote').value.trim()||''
    });
    mergeSameDayBatches(item);
    // 重算兼容字段
    const totalQty=getItemTotalIn(item);
    const used=getItemTotalUsed(item);
    item.qty=totalQty;
    item.stockQty=Math.max(0,totalQty-used);
    item.totalPrice=item.batches.reduce((s,b)=>s+(Number(b.totalPrice)||0),0);
    item.price=totalQty>0?item.totalPrice/totalQty:0;
    item.avgPrice=item.price;
    item.updatedAt=new Date().toISOString();
    save();
    showToast('已入库');
    closeModal('iRestockModal');
    hideTabbar(false);
    const { groups }=groupItems(state.items);
    const g=groups.find(gg=>gg.items.includes(item));
    if(g) showDetail(g);
    renderOverview();
  }

  function openUseModal(item){
    useTargetItem=item;
    const batches=getItemBatches(item);
    if(!batches.length){ showToast('该物品暂无入库批次'); return; }
    const sorted=batches.slice().sort((a,b)=>(b.date||'').localeCompare(a.date||''));
    useSelectedBatch=sorted[0].id;
    useSelectedDate=todayStr();
    temp.useQty='';
    temp.useNote='';
    $('#iUseSub').textContent=`从指定批次取用「${item.name}」`;
    $('#iUseBatch').textContent=`${useSelectedBatch}（${getBatchAvailableQty(item, useSelectedBatch)}件可用）`;
    $('#iUseDate').textContent=formatDateDot(useSelectedDate);
    $('#iUseQty').value='';
    $('#iUseNote').value='';
    $('#iUseNoteCount').textContent='0';
    openModal('iUseModal');
    hideTabbar(true);
  }
  function bindUseEvents(){
    $('#iUseBatchRow')?.addEventListener('click',()=>{
      if(!useTargetItem) return;
      renderUseBatchList();
      openModal('iUseBatchModal');
      hideTabbar(true);
    });
    $('#iUseDateRow')?.addEventListener('click',()=>{
      renderUseDatePicker();
      openModal('iUseDateModal');
      hideTabbar(true);
    });
    $('#iUseNote')?.addEventListener('input', e=>{ $('#iUseNoteCount').textContent=e.target.value.length; });
    $('#iUseCancel')?.addEventListener('click',()=>{ closeModal('iUseModal'); hideTabbar(false); });
    $('#iUseConfirm')?.addEventListener('click', saveUse);
    $('#iUseBatchCancel')?.addEventListener('click',()=>closeModal('iUseBatchModal'));
    $('#iUseBatchConfirm')?.addEventListener('click',()=>closeModal('iUseBatchModal'));
    $('#iUseDateCancel')?.addEventListener('click',()=>closeModal('iUseDateModal'));
    $('#iUseDateConfirm')?.addEventListener('click',()=>closeModal('iUseDateModal'));
  }
  function renderUseBatchList(){
    const item=useTargetItem;
    if(!item) return;
    const batches=getItemBatches(item).slice().sort((a,b)=>(b.date||'').localeCompare(a.date||''));
    const list=$('#iUseBatchList');
    list.innerHTML=batches.map(b=>{
      const avail=getBatchAvailableQty(item, b.id);
      const active=useSelectedBatch===b.id;
      return `<div class="i-bs-batch-item ${active?'active':''} ${avail<=0?'disabled':''}" data-id="${b.id}">
        <span class="i-bs-batch-name">${b.id}</span>
        <span class="i-bs-batch-avail">${avail}件可用</span>
      </div>`;
    }).join('');
    $$('.i-bs-batch-item', list).forEach(el=>{
      el.addEventListener('click',()=>{
        if(el.classList.contains('disabled')) return;
        useSelectedBatch=el.dataset.id;
        const it=useTargetItem;
        $('#iUseBatch').textContent=`${useSelectedBatch}（${getBatchAvailableQty(it, useSelectedBatch)}件可用）`;
        renderUseBatchList();
      });
    });
  }
  function renderUseDatePicker(){
    const [y,m,d]=(useSelectedDate||todayStr()).split('-').map(Number);
    temp.useDateY=y; temp.useDateM=m; temp.useDateD=d;
    const yearCol=$('#iUseDateYear'), monthCol=$('#iUseDateMonth'), dayCol=$('#iUseDateDay');
    yearCol.innerHTML='';
    for(let i=2020;i<=2060;i++){
      const div=document.createElement('div');
      div.className='i-bs-date-item'+(i===y?' active':'');
      div.textContent=i+'年';
      div.addEventListener('click',()=>{ temp.useDateY=i; useSelectedDate=`${i}-${String(temp.useDateM).padStart(2,'0')}-${String(Math.min(temp.useDateD,daysInMonth(i,temp.useDateM))).padStart(2,'0')}`; renderUseDatePicker(); });
      yearCol.appendChild(div);
    }
    monthCol.innerHTML='';
    for(let i=1;i<=12;i++){
      const div=document.createElement('div');
      div.className='i-bs-date-item'+(i===m?' active':'');
      div.textContent=i+'月';
      div.addEventListener('click',()=>{ temp.useDateM=i; useSelectedDate=`${temp.useDateY}-${String(i).padStart(2,'0')}-${String(Math.min(temp.useDateD,daysInMonth(temp.useDateY,i))).padStart(2,'0')}`; renderUseDatePicker(); });
      monthCol.appendChild(div);
    }
    dayCol.innerHTML='';
    const dim=daysInMonth(temp.useDateY,temp.useDateM);
    for(let i=1;i<=dim;i++){
      const div=document.createElement('div');
      div.className='i-bs-date-item'+(i===d?' active':'');
      div.textContent=i+'日';
      div.addEventListener('click',()=>{ temp.useDateD=i; useSelectedDate=`${temp.useDateY}-${String(temp.useDateM).padStart(2,'0')}-${String(i).padStart(2,'0')}`; renderUseDatePicker(); });
      dayCol.appendChild(div);
    }
    requestAnimationFrame(()=>{
      ['#iUseDateYear','#iUseDateMonth','#iUseDateDay'].forEach(sel=>{
        const active=$(sel+' .active');
        if(active && active.parentNode) active.parentNode.scrollTop=active.offsetTop - active.parentNode.clientHeight/2 + active.clientHeight/2;
      });
    });
  }
  function saveUse(){
    if(!useTargetItem) return;
    const qty=Number($('#iUseQty').value)||0;
    if(qty<=0){ showToast('请输入取用数量'); return; }
    if(!useSelectedBatch){ showToast('请选择批次'); return; }
    const avail=getBatchAvailableQty(useTargetItem, useSelectedBatch);
    if(qty>avail){ showToast(`该批次仅 ${avail} 件可用`); return; }
    const note=$('#iUseNote').value.trim();
    const item=useTargetItem;
    if(!Array.isArray(item.usings)) item.usings=[];
    item.usings.push({
      batchId: useSelectedBatch,
      date: useSelectedDate,
      quantity: Math.round(qty*10)/10,
      note: note
    });
    item.updatedAt=new Date().toISOString();
    save();
    showToast('已取用');
    closeModal('iUseModal');
    hideTabbar(false);
    const { groups }=groupItems(state.items);
    const g=groups.find(gg=>gg.items.includes(item));
    if(g) showDetail(g);
    renderOverview();
  }

  /* ===== 隐藏/恢复底部标签栏（弹窗时） ===== */
  function hideTabbar(hide){
    const tb=document.querySelector('.tabbar-root');
    if(!tb) return;
    tb.style.display=hide?'none':'';
  }

  /* ===== 编辑库存品 子页 ===== */
  let editTargetItem=null;
  function openEditItem(item){
    editTargetItem=item;
    temp.selectedCategory=item.categoryId;
    temp.selectedIcon=item.icon||'📦';
    $('#iEditName').value=item.name||'';
    updateEditCategoryUI();
    updateEditIconBtn();
    $('#iEditQty').textContent=getItemCurrentStock(item);
    const batches=getItemBatches(item);
    const latest=batches[batches.length-1] || {unitPrice:0, totalPrice:0};
    $('#iEditUnitPrice').value=Number(latest.unitPrice||0).toFixed(2);
    $('#iEditTotalPrice').value=Number(latest.totalPrice||0).toFixed(2);
    $('#iEditBatchCount').textContent=batches.length;
    $('#iEditLocation').value=item.location||'';
    // 退库日期（选填）：单件直接选日期；批量按批次各自设置
    temp.editRetiredMap={};
    temp.editRetiredSel='';
    const eb=getItemBatches(item);
    if(eb.length<=1){
      $('#iEditRetiredSingleWrap').style.display='';
      $('#iEditRetiredBatchWrap').style.display='none';
      $('#iEditRetiredDate').value=item.retiredDate||'';
    }else{
      $('#iEditRetiredSingleWrap').style.display='none';
      $('#iEditRetiredBatchWrap').style.display='';
      eb.forEach(b=>{ temp.editRetiredMap[b.id]=b.retiredDate||''; });
      $('#iEditRetiredBatchSel').textContent='选择批次';
      $('#iEditRetiredBatchDate').value='';
    }
    bindEditPriceLinks();
    hideTabbar(true);
    showSubpage('edit');
  }
  function openEditRetiredBatchModal(){
    if(!editTargetItem) return;
    const item=editTargetItem;
    const batches=getItemBatches(item).slice().sort((a,b)=>(b.date||'').localeCompare(a.date||''));
    $('#iEditRetiredBatchList').innerHTML=batches.map(b=>`
      <div class="i-bs-batch-item ${temp.editRetiredSel===b.id?'active':''}" data-id="${escapeHtml(b.id)}">
        <div class="i-bs-batch-top"><span class="i-bs-batch-name">${escapeHtml(b.id)}</span></div>
        <div class="i-bs-batch-sub">${b.retiredDate?('退库日期 '+formatDateDot(b.retiredDate)):'未设置退库日期'}</div>
      </div>`).join('') || '<div class="i-empty"><p>暂无入库批次</p></div>';
    $$('#iEditRetiredBatchList .i-bs-batch-item').forEach(el=>{
      el.addEventListener('click',()=>{
        $$('#iEditRetiredBatchList .i-bs-batch-item').forEach(x=>x.classList.remove('active'));
        el.classList.add('active');
        temp.editRetiredSel=el.dataset.id;
        $('#iEditRetiredBatchSel').textContent=el.dataset.id;
        $('#iEditRetiredBatchDate').value=temp.editRetiredMap[el.dataset.id]||'';
      });
    });
    openModal('iEditRetiredBatchModal');
  }
  function bindEditPriceLinks(){
    const up=$('#iEditUnitPrice'), tp=$('#iEditTotalPrice');
    if(up && !up._bound){
      up.addEventListener('input',()=>{
        const stock=getItemCurrentStock(editTargetItem);
        if(stock>0) tp.value=(Number(up.value||0)*stock).toFixed(2);
      });
      up._bound=true;
    }
  }
  function updateEditCategoryUI(){
    const cat=getCategory(temp.selectedCategory);
    const display=$('#iEditCategory');
    const tag=$('#iEditCatTag');
    if(!cat){ display.innerHTML='<span class="i-placeholder">请选择分类</span>'; tag.style.display='none'; return; }
    const path=getCategoryPath(cat.id);
    display.textContent=path.primaryName;
    tag.style.display=cat.system? 'none':'inline-block';
  }
  function updateEditIconBtn(){
    const ic=temp.selectedIcon||'📦';
    const html=(ic.includes('/')||ic.startsWith('data:'))
      ? `<img src="${escapeHtml(ic)}" style="width:100%;height:100%;object-fit:contain" alt="">`
      : escapeHtml(ic);
    $('#iEditIconPreview').innerHTML=html;
  }
  function bindEditEvents(){
    $('#iEditBack')?.addEventListener('click',()=>{ editTargetItem=null; hideTabbar(false); showSubpage('detail'); });
    $('#iEditCancel')?.addEventListener('click',()=>{ editTargetItem=null; hideTabbar(false); showSubpage('detail'); });
    $('#iEditIconBtn')?.addEventListener('click',()=>openIconPicker());
    $('#iEditCatTrigger')?.addEventListener('click',()=>openCategoryPicker());
    $('#iEditBatchCountRow')?.addEventListener('click',()=>{ renderEditBatchList(); openModal('iEditBatchListModal'); });
    $('#iEditBatchListClose')?.addEventListener('click',()=>closeModal('iEditBatchListModal'));
    // 退库日期（批量）：选择入库批次 + 该批次退库日期
    $('#iEditRetiredBatchSelRow')?.addEventListener('click',()=>openEditRetiredBatchModal());
    $('#iEditRetiredBatchDate')?.addEventListener('change',()=>{
      if(temp.editRetiredSel) temp.editRetiredMap[temp.editRetiredSel]=$('#iEditRetiredBatchDate').value||'';
    });
    $('#iEditRetiredBatchCancel')?.addEventListener('click',()=>closeModal('iEditRetiredBatchModal'));
    $('#iEditRetiredBatchConfirm')?.addEventListener('click',()=>closeModal('iEditRetiredBatchModal'));
    $('#iEditSave')?.addEventListener('click', saveEdit);
  }
  function renderEditBatchList(){
    if(!editTargetItem) return;
    const item=editTargetItem;
    const usings=getItemUsings(item);
    const batches=getItemBatches(item).slice().sort((a,b)=>(b.date||'').localeCompare(a.date||''));
    $('#iEditBatchList').innerHTML=batches.map(b=>{
      const total=Number(b.quantity||0);
      const used=usings.filter(u=>u.batchId===b.id).reduce((s,u)=>s+(Number(u.quantity)||0),0);
      const avail=Math.max(0, total-used);
      return `<div class="i-bs-batch-item">
        <div class="i-bs-batch-top">
          <span class="i-bs-batch-name">${escapeHtml(b.id)}</span>
        </div>
        <div class="i-bs-batch-sub">总数 ${total} · 可用 ${avail} · 已取用 ${used}</div>
      </div>`;
    }).join('') || '<div class="i-empty"><p>暂无入库批次</p></div>';
  }
  function saveEdit(){
    if(!editTargetItem) return;
    const name=$('#iEditName').value.trim();
    if(!name){ showToast('请输入物品名称'); return; }
    if(!temp.selectedCategory){ showToast('请选择分类'); return; }
    const item=editTargetItem;
    item.name=name;
    item.icon=temp.selectedIcon||'📦';
    item.categoryId=temp.selectedCategory;
    const batches=getItemBatches(item);
    if(batches.length){
      const latest=batches[batches.length-1];
      latest.unitPrice=Number($('#iEditUnitPrice').value)||0;
      latest.totalPrice=Number($('#iEditTotalPrice').value)||(latest.unitPrice*(latest.quantity||0));
    }
    // 购买均价：维护（编辑）时填写的单价，直接记录，不再重算
    const allBatches=getItemBatches(item);
    item.avgPrice=allBatches.length?allBatches[allBatches.length-1].unitPrice:0;
    item.location=$('#iEditLocation').value.trim().slice(0,100);
    // 退库日期（选填）：单件存 item.retiredDate 并同步到唯一批次；批量按批次各自保存
    const ebatches=getItemBatches(item);
    if(ebatches.length<=1){
      item.retiredDate=$('#iEditRetiredDate').value||'';
      if(ebatches.length) ebatches[0].retiredDate=item.retiredDate;
    }else{
      ebatches.forEach(b=>{ b.retiredDate=temp.editRetiredMap[b.id]||''; });
      item.retiredDate='';
    }
    item.updatedAt=new Date().toISOString();
    save();
    showToast('已保存修改');
    editTargetItem=null;
    hideTabbar(false);
    const { groups }=groupItems(state.items);
    const g=groups.find(gg=>gg.items.includes(item));
    if(g) showDetail(g);
  }

  /* ===== 数据同步（导出/导入 JSON） ===== */
  function exportItems(){
    const data={
      version: 3,
      exportedAt: new Date().toISOString(),
      items: state.items,
      customCategories: state.customCategories
    };
    const json=JSON.stringify(data, null, 2);
    const blob=new Blob([json], {type:'application/json'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    const ts=new Date().toISOString().slice(0,10).replace(/-/g,'');
    a.href=url;
    a.download=`you-items-backup-${ts}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(()=>URL.revokeObjectURL(url), 5000);
    showToast(`已导出 ${state.items.length} 件物品`);
  }
  function importItems(file){
    const reader=new FileReader();
    reader.onload=(e)=>{
      try{
        const data=JSON.parse(e.target.result);
        if(!data || !Array.isArray(data.items)){
          showToast('文件格式不正确');
          return;
        }
        if(!confirm(`检测到 ${data.items.length} 件物品。\n\n将合并到当前数据（${state.items.length} 件）。\n\n继续？`)) return;
        // 合并：同 ID 以导入为准，新增直接添加
        const existingMap=new Map(state.items.map(it=>[it.id, it]));
        const stamp=new Date().toISOString();
        data.items.forEach(it=>{
          if(it && !it.updatedAt) it.updatedAt=stamp;
          existingMap.set(it.id, it);
        });
        state.items=[...existingMap.values()];
        // 合并分类
        if(Array.isArray(data.customCategories)){
          const catMap=new Map(state.customCategories.map(c=>[c.id, c]));
          data.customCategories.forEach(c=>{
            if(c && !c.updatedAt) c.updatedAt=stamp;
            catMap.set(c.id, c);
          });
          state.customCategories=[...catMap.values()];
        }
        // 合并删除标记
        if(Array.isArray(data.deletedIds)){
          data.deletedIds.forEach(id=>{ if(id && !TOMB.includes(id)) TOMB.push(id); });
        }
        if(TOMB.length){
          const ts=new Set(TOMB);
          state.items=state.items.filter(it=>!ts.has(it.id));
          state.customCategories=state.customCategories.filter(c=>!ts.has(c.id));
        }
        save();
        showToast(`已导入，当前共 ${state.items.length} 件物品`);
        closeModal('iSyncModal');
        renderOverview();
        renderCategoriesPage();
      }catch(err){
        console.error(err);
        showToast('文件解析失败：'+err.message);
      }
    };
    reader.readAsText(file);
  }
  /* ===== 云端双向同步（后端可切换：GitHub / Gitee） ===== */
  function syncBackend(){ return (window.SYNC_CONFIG && window.SYNC_CONFIG.backend) || 'github'; }
  function syncCfg(){ const c=window.SYNC_CONFIG; return (c && c[syncBackend()]) || c.github; }
  function syncRepo(){ return syncCfg().repo; }
  function syncBranch(){ return syncCfg().branch || (syncBackend()==='gitee'?'master':'main'); }
  function syncPath(){ return syncCfg().path; }
  function syncToken(){ return syncCfg().token; }
  function syncIsGitee(){ return syncBackend()==='gitee'; }
  function syncApiUrl(){
    if(syncIsGitee()) return `https://gitee.com/api/v5/repos/${syncRepo()}/contents/${syncPath()}`;
    return `https://api.github.com/repos/${syncRepo()}/contents/${syncPath()}`;
  }
  function syncRawUrl(){
    if(syncIsGitee()) return `https://gitee.com/${syncRepo()}/raw/${syncBranch()}/${syncPath()}`;
    return `https://raw.githubusercontent.com/${syncRepo()}/${syncBranch()}/${syncPath()}`;
  }
  function syncHeaders(extra){
    const h=Object.assign({}, extra||{});
    if(syncIsGitee()){ h['Authorization']='token '+syncToken(); }
    else { h['Authorization']='Bearer '+syncToken(); h['Accept']='application/vnd.github+json'; }
    return h;
  }
  function b64utf8(str){ return btoa(unescape(encodeURIComponent(str))); }
  function unb64utf8(b64){ return decodeURIComponent(escape(atob(String(b64).replace(/\s/g,'')))); }
  function fmtSyncTime(iso){ try{ return new Date(iso).toLocaleString('zh-CN',{hour12:false}); }catch(e){ return iso||'未知'; } }
  function setSyncStatus(text){ const el=document.getElementById('iSyncCloudStatus'); if(el) el.textContent=text||''; }
  function setSyncErr(msg){
    const el=document.getElementById('iSyncErrBox');
    if(el){ el.textContent=msg||''; el.style.display=msg?'block':'none'; }
    if(msg) console.warn('[sync]', msg);
  }
  function syncBackendLabel(){ return syncIsGitee()?'Gitee（码云）':'GitHub'; }
  // 弱网/被限速时自动重试（GitHub API 在大陆常时通时断），默认 3 次、单次 18s 超时
  async function retryFetch(url, options, attempts, timeoutMs){
    attempts=attempts||3; timeoutMs=timeoutMs||18000;
    let lastErr;
    for(let i=0;i<attempts;i++){
      const ctrl=new AbortController();
      const to=setTimeout(()=>ctrl.abort(), timeoutMs);
      try{
        const r=await fetch(url, Object.assign({signal:ctrl.signal}, options));
        clearTimeout(to);
        return r;   // 任何 HTTP 状态码都算"连通成功"，由调用方判断 401/404 等
      }catch(e){
        clearTimeout(to);
        lastErr=e;
        if(e && e.name==='AbortError') lastErr=new Error('连接超时（'+Math.round(timeoutMs/1000)+'s 无响应）');
        if(i<attempts-1){ await new Promise(r=>setTimeout(r, 800*(i+1))); }  // 退避后重试
      }
    }
    throw lastErr||new Error('连接失败');
  }

  // 回填缺失的 updatedAt（legacy 数据），避免合并时被误判为"更旧"而丢失
  function ensureSyncMeta(){
    const t=new Date().toISOString();
    state.items.forEach(it=>{ if(it && !it.updatedAt) it.updatedAt=t; });
    state.customCategories.forEach(c=>{ if(c && !c.updatedAt) c.updatedAt=t; });
  }
  // 按 updatedAt 做 last-write-wins 合并（同 id 取较新的一方）
  function mergeByUpdatedAt(localArr, cloudArr){
    const map=new Map();
    (localArr||[]).forEach(x=>{ if(x && x.id) map.set(x.id, x); });
    (cloudArr||[]).forEach(c=>{
      if(!c || !c.id) return;
      const l=map.get(c.id);
      if(!l){ map.set(c.id, c); return; }
      const lt=l.updatedAt?new Date(l.updatedAt).getTime():0;
      const ct=c.updatedAt?new Date(c.updatedAt).getTime():0;
      if(ct>=lt) map.set(c.id, c);   // 云端较新或相等 → 云端胜
    });
    return [...map.values()];
  }
  function unionTombstones(a, b){
    const s=new Set(a||[]);
    (b||[]).forEach(x=>{ if(x) s.add(x); });
    return [...s];
  }
  function applyTombstones(){
    if(!TOMB.length) return;
    const set=new Set(TOMB);
    state.items=state.items.filter(it=>!set.has(it.id));
    state.customCategories=state.customCategories.filter(c=>!set.has(c.id));
  }

  function pullCloudData(){
    return new Promise((resolve, reject)=>{
      const url=(syncIsGitee()?syncApiUrl():syncRawUrl())+'?t='+Date.now();
      const opts={cache:'no-store', headers: syncIsGitee()?syncHeaders():{}};
      retryFetch(url, opts, 3, 18000)
        .then(r=>{
          if(r.status===404) return {items:[], customCategories:[], deletedIds:[], empty:true};
          if(!r.ok) throw new Error('HTTP '+r.status);
          return r.json();
        })
        .then(data=>{
          // Gitee 经 API 返回 base64 content；GitHub 经 raw 返回纯 JSON
          if(syncIsGitee() && data && data.content){
            try{ data=JSON.parse(unb64utf8(data.content)); }catch(e){ data={items:[],customCategories:[],deletedIds:[]}; }
          }
          resolve((data && Array.isArray(data.items))?data:{items:[],customCategories:[],deletedIds:[]});
        })
        .catch(err=> reject(err));
    });
  }

  async function doPull(){
    const btn=document.getElementById('iSyncPullBtn');
    if(btn){ btn.disabled=true; btn.textContent='下载中…'; }
    try{
      const data=await pullCloudData();
      if(data.empty){ showToast('云端暂无数据'); setSyncStatus('云端暂无数据'); setSyncErr(''); return; }
      ensureSyncMeta();
      TOMB=unionTombstones(TOMB, data.deletedIds);
      state.items=mergeByUpdatedAt(state.items, data.items);
      state.customCategories=mergeByUpdatedAt(state.customCategories, data.customCategories);
      applyTombstones();
      save();
      renderOverview(); renderCategoriesPage();
      showToast('已从云端同步（'+state.items.length+' 件）');
      setSyncStatus('云端更新于 '+fmtSyncTime(data.syncedAt));
      setSyncErr('');
    }catch(err){
      console.error(err);
      const msg='下载失败：'+(err&&err.message?err.message:err);
      showToast(msg);
      setSyncErr('❌ '+msg+'（多为网络无法访问 '+syncBackendLabel()+' API，建议改用 Gitee 后端）');
    }finally{
      if(btn){ btn.disabled=false; btn.textContent='从云端下载'; }
    }
  }

  async function doPush(){
    const btn=document.getElementById('iSyncPushBtn');
    if(btn){ btn.disabled=true; btn.textContent='同步中…'; }
    const token=syncToken();
    if(!token){ const m='未配置云端同步 Token'; showToast(m); setSyncErr('⚠️ '+m); if(btn){ btn.disabled=false; btn.textContent='同步到云端'; } return; }
    try{
      // 1) 先拉取云端，做 last-write-wins 合并，避免覆盖另一端的新数据
      const api=await retryFetch(syncApiUrl(), {headers:syncHeaders()}, 3, 18000);
      let cloudSha=null, cloudData={items:[], customCategories:[], deletedIds:[]};
      if(api.ok){
        const j=await api.json();
        cloudSha=j.sha||null;
        if(j.content){ try{ cloudData=JSON.parse(unb64utf8(j.content)); }catch(e){} }
      } else if(api.status!==404){
        throw new Error('读取云端失败 HTTP '+api.status);
      }
      ensureSyncMeta();
      // ⚠️ 关键修复：同步到云端【绝不】改动本地数据。
      // 仅在计算【上传内容】时把云端较新的数据合并进来（避免覆盖另一端新数据），
      // 该结果【只用于上传】；本地 state.items / TOMB 一律不改写，也绝不 applyTombstones，
      // 因此即使云端有其他设备的删除标记，也绝不会把本机已维护的数据删掉。
      const uploadItems=mergeByUpdatedAt(state.items, (cloudData.items||[]).filter(c=>c&&c.id&&!TOMB.includes(c.id)));
      const uploadCats=mergeByUpdatedAt(state.customCategories, (cloudData.customCategories||[]).filter(c=>c&&c.id&&!TOMB.includes(c.id)));
      const uploadTomb=unionTombstones(TOMB, cloudData.deletedIds);
      // 2) 上传合并后的完整数据（含删除标记）。本地数据原封不动，不 save、不改写。
      const payload={ version:3, syncedAt:new Date().toISOString(), items:uploadItems, customCategories:uploadCats, deletedIds:uploadTomb };
      const body={ message:'物品数据同步 '+payload.syncedAt, content:b64utf8(JSON.stringify(payload,null,2)), branch: syncBranch() };
      if(cloudSha) body.sha=cloudSha;
      const pu=await retryFetch(syncApiUrl(), {
        method:'PUT',
        headers:syncHeaders({'Content-Type':'application/json'}),
        body: JSON.stringify(body)
      }, 3, 18000);
      if(!pu.ok){ const er=await pu.json().catch(()=>({})); throw new Error('上传失败 HTTP '+pu.status+(er&&er.message?(' '+er.message):'')); }
      showToast('已同步到云端（'+uploadItems.length+' 件）');
      setSyncStatus('云端更新于 '+fmtSyncTime(payload.syncedAt));
      setSyncErr('✅ 已成功上传到 '+syncBackendLabel()+' 云端');
      renderOverview(); renderCategoriesPage();
    }catch(err){
      console.error(err);
      const msg='同步失败：'+(err&&err.message?err.message:err);
      showToast(msg);
      setSyncErr('❌ '+msg+'（多为网络无法访问 '+syncBackendLabel()+' API，建议改用 Gitee 后端）');
    }finally{
      if(btn){ btn.disabled=false; btn.textContent='同步到云端'; }
    }
  }

  async function testConnection(){
    const btn=document.getElementById('iSyncTestBtn');
    const b=syncBackend(), cfg=syncCfg();
    if(!cfg.token){ setSyncErr('⚠️ 未配置 Token，无法测试连接'); return; }
    if(btn){ btn.disabled=true; btn.textContent='测试中…'; }
    setSyncErr('正在测试连接 '+syncBackendLabel()+' API（含 3 次重试）…');
    try{
      const r=await retryFetch(syncApiUrl()+'?t='+Date.now(), {headers:syncHeaders()}, 3, 18000);
      if(r.status===200){ setSyncErr('✅ 连接成功（'+b+' API 可达），可正常同步'); }
      else if(r.status===401||r.status===403){ setSyncErr('⚠️ 连接成功但 Token 无效/无权限（HTTP '+r.status+'），请检查 Token'); }
      else if(r.status===404){ setSyncErr('✅ 连接成功（'+b+' API 可达，仓库/文件尚未创建，首次同步会自动创建）'); }
      else { setSyncErr('⚠️ 连接返回 HTTP '+r.status+'，请检查仓库/路径配置'); }
    }catch(e){
      if(e && e.name==='AbortError'){ setSyncErr('❌ 连接超时（多次重试仍无响应）—— 你的网络很可能无法访问 '+b+' API。建议把 sync-config.js 的 backend 改为 "gitee" 使用码云。'); }
      else { setSyncErr('❌ 连接失败：'+(e&&e.message||e)+' —— 通常是网络被拦截，无法访问 '+b+' API。建议改用 Gitee 后端。'); }
    }finally{
      if(btn){ btn.disabled=false; btn.textContent='测试连接'; }
    }
  }

  function forceReload(){
    try{
      if('serviceWorker' in navigator){
        navigator.serviceWorker.getRegistrations().then(regs=>regs.forEach(r=>r.update()));
      }
    }catch(e){}
    window.location.reload(true);
  }

  function openSyncModal(){
    const be=document.getElementById('iSyncBackendLabel');
    if(be) be.textContent=syncBackendLabel();
    const ver=document.getElementById('iSyncVerLabel');
    if(ver) ver.textContent=(window.APP_VERSION||'v?');
    setSyncErr('');
    setSyncStatus('');
    const counts=countSyncStats();
    const ic=document.getElementById('iSyncItemCount'); if(ic) ic.textContent=counts.items;
    const bc=document.getElementById('iSyncBatchCount'); if(bc) bc.textContent=counts.batches;
    const uc=document.getElementById('iSyncUsingCount'); if(uc) uc.textContent=counts.usings;
    // 后台探一下云端时间
    pullCloudData().then(d=>{ if(!d.empty) setSyncStatus('云端更新于 '+fmtSyncTime(d.syncedAt)); }).catch(()=>{});
    openModal('iSyncModal');
  }
  function countSyncStats(){
    let batches=0, usings=0;
    (state.items||[]).forEach(it=>{ batches+=(it.batches||[]).length; usings+=(it.usings||[]).length; });
    return {items:(state.items||[]).length, batches, usings};
  }

  function bindSyncEvents(){
    $('#iSyncBtn')?.addEventListener('click', openSyncModal);
    $('#iSyncPullBtn')?.addEventListener('click', doPull);
    $('#iSyncPushBtn')?.addEventListener('click', doPush);
    $('#iSyncTestBtn')?.addEventListener('click', testConnection);
    $('#iSyncReloadBtn')?.addEventListener('click', forceReload);
    $('#iSyncExportBtn')?.addEventListener('click', exportItems);
    $('#iSyncImportBtn')?.addEventListener('click',()=>$('#iSyncFileInput').click());
    $('#iSyncFileInput')?.addEventListener('change',(e)=>{
      const file=e.target.files[0];
      if(file) importItems(file);
      e.target.value='';
    });
  }

  /* ===== 弹层 ===== */
  function openModal(id){ $('#'+id).classList.add('show'); }
  function closeModal(id){ $('#'+id).classList.remove('show'); }

  function openTextModal(title, value, onSave){
    const modal=$('#iTextModal');
    $('#iTextModalTitle').textContent=title;
    $('#iTextModalInput').value=value||'';
    openModal('iTextModal');
    $('#iTextModalSave').onclick=()=>{
      const v=$('#iTextModalInput').value.trim();
      if(!v){ showToast('名称不能为空'); return; }
      onSave(v);
      closeModal('iTextModal');
    };
  }
  function openIconTextModal(title, value, icon, onSave){
    temp.selectedIcon=icon||'📁';
    temp.iconTextSaveCallback=onSave;
    $('#iIconTextModalTitle').textContent=title;
    $('#iIconTextModalInput').value=value||'';
    updateChildIconPreview();
    openModal('iIconTextModal');
    $('#iIconTextModalSave').onclick=()=>{
      const v=$('#iIconTextModalInput').value.trim();
      if(!v){ showToast('名称不能为空'); return; }
      if(temp.iconTextSaveCallback) temp.iconTextSaveCallback(v, temp.selectedIcon);
      closeModal('iIconTextModal');
    };
  }

  function updateChildIconPreview(){
    const preview=$('#iChildIconPreview');
    const hint=$('#iChildIconHint');
    if(!preview) return;
    const icon=temp.selectedIcon||'📁';
    if(icon.includes('/') || icon.startsWith('data:')){
      preview.innerHTML=`<img src="${icon}" alt="" loading="lazy" onerror="this.style.display='none';this.parentNode.textContent='📁'">`;
    }else{
      preview.textContent=icon;
    }
    if(hint) hint.textContent=(icon==='📁'||!icon)?'请选择一个图标':'已选择';
  }

  function openCatIconPicker(){
    temp.pickerPrimary=temp.pickerPrimary || SYSTEM_PRIMARY[0].id;
    renderCatIconPicker();
    openModal('iCatIconPickerModal');
  }

  function renderCatIconPicker(){
    const selected=temp.pickerPrimary;
    const chipRow=$('#iPickerChips');
    chipRow.innerHTML=SYSTEM_PRIMARY.map(p=>`
      <button type="button" class="i-picker-chip ${selected===p.id?'active':''}" data-id="${p.id}">${escapeHtml(p.name)}</button>
    `).join('');
    enableDragScroll(chipRow);
    $$('#iPickerChips .i-picker-chip').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        temp.pickerPrimary=btn.dataset.id;
        renderCatIconPicker();
      });
    });

    const list=getSystemSecondary(selected);
    $('#iPickerGrid').innerHTML=list.map(c=>`
      <button type="button" class="i-picker-icon-btn ${c.icon===temp.selectedIcon?'selected':''}" data-icon="${escapeHtml(c.icon)}">
        <span class="i-picker-icon-img">${renderIcon(c.icon, c.name)}</span>
        <span class="i-picker-icon-label">${escapeHtml(c.name)}</span>
      </button>
    `).join('');
    $$('#iPickerGrid .i-picker-icon-btn').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        temp.selectedIcon=btn.dataset.icon;
        updateChildIconPreview();
        closeModal('iCatIconPickerModal');
      });
    });
  }

  function openCategoryPicker(){
    // 滚轮式分类选择器（截图1）：仅一级分类 = 自定义一级 + 系统一级
    const customs=customPrimaryCategories().filter(c=>c.id!==UNCATEGORIZED_ID);
    temp.wheelList=[
      ...customs.map(c=>({id:c.id,name:c.name})),
      ...SYSTEM_PRIMARY.map(p=>({id:p.id,name:p.name}))
    ];
    // 当前选中可能是二级分类，映射回其一级
    let curId=temp.selectedCategory;
    if(curId){
      const path=getCategoryPath(curId);
      curId=path.primaryId;
    }
    const idx=temp.wheelList.findIndex(c=>c.id===curId);
    temp.wheelIndex=idx>=0?idx:0;
    renderCatWheel();
    openModal('iCategoryModal');
    // 隐藏态(display:none)下设置 scrollTop 无效，等弹层可见后再滚动到选中项
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      const wheel=$('#iCatWheel');
      if(wheel) wheel.scrollTop=temp.wheelIndex*WHEEL_ITEM_H;
    }));
  }

  const WHEEL_ITEM_H=48;
  function renderCatWheel(scrollToSelected){
    const wheel=$('#iCatWheel');
    const list=temp.wheelList||[];
    const pad=h=>`<div style="height:${h}px;flex:none"></div>`;
    wheel.innerHTML=pad(WHEEL_ITEM_H*2)+list.map((c,i)=>
      `<div class="i-wheel-item ${i===temp.wheelIndex?'active':''}" data-idx="${i}">${escapeHtml(c.name)}</div>`
    ).join('')+pad(WHEEL_ITEM_H*2);
    $$('.i-wheel-item', wheel).forEach(el=>{
      el.addEventListener('click', ()=>{
        temp.wheelIndex=Number(el.dataset.idx);
        $$('.i-wheel-item', wheel).forEach(x=>x.classList.toggle('active', Number(x.dataset.idx)===temp.wheelIndex));
        centerWheel(wheel, temp.wheelIndex);
      });
    });
    if(scrollToSelected){
      wheel.scrollTop=temp.wheelIndex*WHEEL_ITEM_H;
    }
    if(!wheel._bound){
      let t;
      wheel.addEventListener('scroll', ()=>{
        clearTimeout(t);
        t=setTimeout(()=>{
          const max=temp.wheelList.length-1;
          const idx=Math.max(0, Math.min(max, Math.round(wheel.scrollTop/WHEEL_ITEM_H)));
          if(idx!==temp.wheelIndex){
            temp.wheelIndex=idx;
            $$('.i-wheel-item', wheel).forEach(x=>x.classList.toggle('active', Number(x.dataset.idx)===idx));
          }
        }, 80);
      });
      wheel._bound=true;
    }
  }
  function centerWheel(wheel, idx){
    wheel.scrollTo({top: idx*WHEEL_ITEM_H, behavior:'smooth'});
  }

  function openIconPicker(target){
    // 物品图标选择器：按参考图重绘为分类 chip + 图标网格 + 标签
    temp.iconPickerTab=temp.iconPickerTab||'all';
    temp.iconPickerQuery='';
    const search=$('#iIconSearch');
    if(search){ search.value=''; }
    renderIconPicker();
    openModal('iIconModal');
  }

  function getIconPickerList(){
    const q=(temp.iconPickerQuery||'').trim();
    const tab=temp.iconPickerTab||'all';
    // 自定义：第二行 chip 选择自定义一级分类，展示其子分类图标
    if(tab==='custom'){
      const sub=temp.iconPickerSub||'all';
      let list=[];
      const pushWithChildren=p=>{
        const children=customChildren(p.id);
        if(children.length){
          children.forEach(c=>list.push({name:c.name, icon:c.icon||'📁', type:'custom', id:c.id}));
        }else{
          list.push({name:p.name, icon:p.icon||'📁', type:'custom', id:p.id});
        }
      };
      if(sub==='all'){
        customPrimaryCategories().filter(c=>c.id!==UNCATEGORIZED_ID).forEach(pushWithChildren);
      }else{
        const p=getCategory(sub);
        if(p) pushWithChildren(p);
      }
      if(q) list=list.filter(c=>c.name.toLowerCase().includes(q.toLowerCase()));
      return list;
    }
    // 全部 / 某个系统一级
    let list=[];
    if(tab==='all'){
      SYSTEM_PRIMARY.forEach(p=>{
        getSystemSecondary(p.id).forEach(c=>list.push({...c, type:'sys'}));
      });
    }else{
      list=getSystemSecondary(tab).map(c=>({...c, type:'sys'}));
    }
    if(q){
      list=list.filter(c=>c.name.toLowerCase().includes(q.toLowerCase()));
    }
    return list;
  }

  function renderIconPicker(){
    const tab=temp.iconPickerTab||'all';
    const chipRow=$('#iIconChips');
    const chips=[{id:'all',name:'全部'},{id:'custom',name:'自定义'},...SYSTEM_PRIMARY];
    chipRow.innerHTML=chips.map(p=>`
      <button type="button" class="i-picker-chip ${tab===p.id?'active':''}" data-id="${p.id}">${escapeHtml(p.name)}</button>
    `).join('');
    enableDragScroll(chipRow);
    $$('#iIconChips .i-picker-chip').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        temp.iconPickerTab=btn.dataset.id;
        renderIconPicker();
      });
    });

    // 自定义选中时显示第二行 chip：全部 + 自定义一级分类
    const subRow=$('#iIconSubChips');
    if(tab==='custom'){
      if(!temp.iconPickerSub) temp.iconPickerSub='all';
      const customs=customPrimaryCategories().filter(c=>c.id!==UNCATEGORIZED_ID);
      const subChips=[{id:'all',name:'全部'},...customs.map(c=>({id:c.id,name:c.name}))];
      subRow.style.display='flex';
      subRow.innerHTML=subChips.map(p=>`
        <button type="button" class="i-picker-chip ${temp.iconPickerSub===p.id?'active':''}" data-id="${p.id}">${escapeHtml(p.name)}</button>
      `).join('');
      enableDragScroll(subRow);
      $$('#iIconSubChips .i-picker-chip').forEach(btn=>{
        btn.addEventListener('click', ()=>{
          temp.iconPickerSub=btn.dataset.id;
          renderIconPicker();
        });
      });
    }else{
      subRow.style.display='none';
      subRow.innerHTML='';
    }

    // 搜索框监听
    const search=$('#iIconSearch');
    if(search && !search._bound){
      search.addEventListener('input', ()=>{
        temp.iconPickerQuery=search.value;
        renderIconPickerResults();
      });
      search._bound=true;
    }

    renderIconPickerResults();
  }

  function renderIconPickerResults(){
    const list=getIconPickerList();
    const grid=$('#iIconGrid');
    grid.innerHTML=list.map(c=>`
      <button type="button" class="i-picker-icon-btn ${c.icon===temp.selectedIcon?'selected':''}" data-icon="${escapeHtml(c.icon)}">
        <span class="i-picker-icon-img">${renderIcon(c.icon, c.name)}</span>
        <span class="i-picker-icon-label">${escapeHtml(c.name)}</span>
      </button>
    `).join('');
    $$('.i-picker-icon-btn', grid).forEach(btn=>{
      btn.addEventListener('click', ()=>{
        temp.selectedIcon=btn.dataset.icon;
        updateIconBtn();
        // 编辑页模式下同步刷新预览
        if(editTargetItem) updateEditIconBtn();
        closeModal('iIconModal');
      });
    });
  }

  function openDatePicker(targetId, currentValue){
    temp.dateTarget=targetId;
    temp.dateValue=currentValue||todayStr();
    openModal('iDateModal');
    renderDatePicker();
  }
  function renderDatePicker(){
    const [y,m,d]=temp.dateValue.split('-').map(Number);
    const yearCol=$('#iDateYear'), monthCol=$('#iDateMonth'), dayCol=$('#iDateDay');
    yearCol.innerHTML='';
    for(let i=2000;i<=2060;i++){
      const div=document.createElement('div'); div.textContent=i;
      if(i===y) div.classList.add('active');
      div.addEventListener('click',()=>{ temp.dateValue=`${i}-${String(m).padStart(2,'0')}-${String(Math.min(d,daysInMonth(i,m))).padStart(2,'0')}`; renderDatePicker(); });
      yearCol.appendChild(div);
    }
    monthCol.innerHTML='';
    for(let i=1;i<=12;i++){
      const div=document.createElement('div'); div.textContent=i+'月';
      if(i===m) div.classList.add('active');
      div.addEventListener('click',()=>{ temp.dateValue=`${y}-${String(i).padStart(2,'0')}-${String(Math.min(d,daysInMonth(y,i))).padStart(2,'0')}`; renderDatePicker(); });
      monthCol.appendChild(div);
    }
    dayCol.innerHTML='';
    const dim=daysInMonth(y,m);
    for(let i=1;i<=dim;i++){
      const div=document.createElement('div'); div.textContent=i+'日';
      if(i===d) div.classList.add('active');
      div.addEventListener('click',()=>{ temp.dateValue=`${y}-${String(m).padStart(2,'0')}-${String(i).padStart(2,'0')}`; renderDatePicker(); });
      dayCol.appendChild(div);
    }
    // scroll active into view
    [yearCol,monthCol,dayCol].forEach(col=>{
      const active=col.querySelector('.active');
      if(active && typeof active.scrollIntoView==='function'){
        try{ active.scrollIntoView({block:'center'}); }catch(e){}
      }
    });
  }
  function confirmDatePicker(){
    if(temp.dateTarget){
      $(temp.dateTarget).value=temp.dateValue;
    }
    closeModal('iDateModal');
  }

  function openExpiryPicker(targetId, productionDate){
    temp.dateTarget=targetId;
    temp.expiryValue='';
    temp.expiryUnit='day';
    $('#iExpiryInput').value='';
    $$('#iExpiryUnits button').forEach(b=>b.classList.toggle('active', b.dataset.unit==='day'));
    openModal('iExpiryModal');
  }
  function setExpiryUnit(unit){
    temp.expiryUnit=unit;
    $$('#iExpiryUnits button').forEach(b=>b.classList.toggle('active', b.dataset.unit===unit));
  }
  function confirmExpiryPicker(){
    const v=Number($('#iExpiryInput').value);
    if(!v || v<=0){ showToast('请输入有效数字'); return; }
    // 根据不同上下文选取基准日期
    let pd;
    if(temp.dateTarget==='#iExpiryDate') pd=$('#iProductionDate').value;
    else if(temp.dateTarget==='#iRestockExpiry') pd=$('#iRestockDate').value;
    else pd=$('#iBatchProductionDate').value;
    if(!pd){ showToast('请先设置基准日期'); return; }
    let res;
    if(temp.expiryUnit==='day'){
      const d=parseDate(pd); d.setDate(d.getDate()+v);
      res=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    }else if(temp.expiryUnit==='month'){
      res=addMonthsSafe(pd, v);
    }else{
      res=addYearsSafe(pd, v);
    }
    $(temp.dateTarget).value=res;
    closeModal('iExpiryModal');
  }

  function openSortModal(){
    const field=SORT_FIELDS.find(f=>f.key===state.settings.sortField)||SORT_FIELDS[0];
    const dir=state.settings.sortDir;
    $('#iSortFields').innerHTML=SORT_FIELDS.map(f=>`<button class="i-option ${field.key===f.key?'active':''}" data-key="${f.key}">${f.label}</button>`).join('');
    $('#iSortDirs').innerHTML=`<button class="i-option ${dir==='asc'?'active':''}" data-dir="asc">${field.asc}</button><button class="i-option ${dir==='desc'?'active':''}" data-dir="desc">${field.desc}</button>`;
    openModal('iSortModal');
    bindSortOptions();
  }
  function bindSortOptions(){
    $('#iSortFields').onclick=e=>{
      const btn=e.target.closest('.i-option');
      if(!btn) return;
      const field=SORT_FIELDS.find(f=>f.key===btn.dataset.key);
      state.settings.sortField=field.key;
      renderSortOptions(field, state.settings.sortDir);
    };
    $('#iSortDirs').onclick=e=>{
      const btn=e.target.closest('.i-option');
      if(!btn) return;
      state.settings.sortDir=btn.dataset.dir;
      renderSortOptions(SORT_FIELDS.find(f=>f.key===state.settings.sortField), state.settings.sortDir);
    };
    $('#iSortReset').onclick=()=>{ state.settings.sortField='purchaseDate'; state.settings.sortDir='asc'; save(); closeModal('iSortModal'); renderOverview(); };
    $('#iSortApply').onclick=()=>{ save(); closeModal('iSortModal'); renderOverview(); };
  }
  function renderSortOptions(field, dir){
    $$('#iSortFields .i-option').forEach(b=>b.classList.toggle('active', b.dataset.key===field.key));
    $('#iSortDirs').innerHTML=`<button class="i-option ${dir==='asc'?'active':''}" data-dir="asc">${field.asc}</button><button class="i-option ${dir==='desc'?'active':''}" data-dir="desc">${field.desc}</button>`;
  }

  function openFilterModal(){
    const f=state.settings.filters;
    // categories: flatten primaries + secondaries
    const cats=allCategories().filter(c=>!c.parentId).map(p=>{
      const children=allCategories().filter(c=>c.parentId===p.id);
      let html=`<div class="i-filter-section"><div class="i-filter-section-title">${renderIcon(p.icon||'📁', p.name)} ${escapeHtml(p.name)}</div><div class="i-options">`;
      html+=`<button class="i-option ${f.categories.includes(p.id)?'active':''}" data-id="${p.id}" data-type="cat">全部${escapeHtml(p.name)}</button>`;
      html+=children.map(c=>`<button class="i-option ${f.categories.includes(c.id)?'active':''}" data-id="${c.id}" data-type="cat">${escapeHtml(c.name)}</button>`).join('');
      html+='</div></div>';
      return html;
    }).join('');
    $('#iFilterCategories').innerHTML=cats;

    const statuses=[{k:'stockQty',l:'库存'},{k:'inUseQty',l:'在用'},{k:'scrappedQty',l:'报废'},{k:'retiredQty',l:'退役'}];
    $('#iFilterStatuses').innerHTML=statuses.map(s=>`<button class="i-option ${f.statuses.includes(s.k)?'active':''}" data-id="${s.k}" data-type="status">${s.l}</button>`).join('');
    $('#iFilterStarred').classList.toggle('active', f.starred);

    openModal('iFilterModal');
    bindFilterOptions();
  }
  function bindFilterOptions(){
    const f=state.settings.filters;
    $$('#iFilterModal .i-option').forEach(btn=>{
      btn.addEventListener('click',()=>{
        const type=btn.dataset.type, id=btn.dataset.id;
        if(type==='cat'){
          const idx=f.categories.indexOf(id);
          if(idx>=0) f.categories.splice(idx,1); else f.categories.push(id);
        }else if(type==='status'){
          const idx=f.statuses.indexOf(id);
          if(idx>=0) f.statuses.splice(idx,1); else f.statuses.push(id);
        }
        btn.classList.toggle('active');
      });
    });
    $('#iFilterStarred').onclick=()=>{ f.starred=!f.starred; $('#iFilterStarred').classList.toggle('active', f.starred); };
    $('#iFilterReset').onclick=()=>{ state.settings.filters={categories:[], statuses:[], starred:false}; save(); closeModal('iFilterModal'); renderOverview(); };
    $('#iFilterApply').onclick=()=>{ save(); closeModal('iFilterModal'); renderOverview(); };
  }

  /* ===== 事件绑定 ===== */
  function bindEvents(){
    // 侧边栏三个物品入口：物品统计(总览) / 物品分类 / 到期清单
    $$('.nav-item[data-page="items"]').forEach(nav=>{
      nav.addEventListener('click',()=>{ showSubpage(nav.dataset.subpage||'overview'); });
    });

    // 顶部 tabbar 导航也支持
    $$('.tabbar-item[data-page="items"]').forEach(nav=>{
      nav.addEventListener('click',()=>{ showSubpage(nav.dataset.subpage||'overview'); });
    });

    // 详情页分类/到期清单 返回时回到总览
    $$('.nav-item[data-page="items"][data-subpage="detail"], .tabbar-item[data-page="items"][data-subpage="detail"]').forEach(()=>{});

    // 新弹窗/编辑页事件绑定
    bindUseEvents();
    bindRestockEvents();
    bindEditEvents();
    bindBatchDateEvents();
    bindSyncEvents();

    // overview
    $('#iEyeBtn')?.addEventListener('click',()=>{ state.settings.hideAmount=!state.settings.hideAmount; save(); renderOverview(); });
    $('#iFilterBtn')?.addEventListener('click', openFilterModal);
    $('#iSortBtn')?.addEventListener('click', openSortModal);
    $('#iGalleryBtn')?.addEventListener('click',()=>{ state.settings.viewMode=state.settings.viewMode==='grid'?'list':'grid'; save(); renderOverview(); });
    $('#iAddItemFab')?.addEventListener('click',()=>openAddItem('single'));
    $('#iExpiringMore')?.addEventListener('click',()=>showSubpage('expiring'));
    $('#iCatBackBtn')?.addEventListener('click',()=>showSubpage('overview'));
    $('#iExpiringBackBtn')?.addEventListener('click',()=>showSubpage('overview'));
    $('#iDetailBack')?.addEventListener('click',()=>showSubpage('overview'));

    // add form tabs
    $('#iFormTabSingle')?.addEventListener('click',()=>{ temp.formTab='single'; toggleFormTab(); });
    $('#iFormTabBatch')?.addEventListener('click',()=>{ temp.formTab='batch'; toggleFormTab(); });
    function toggleFormTab(){
      $('#iFormTabSingle').classList.toggle('active', temp.formTab==='single');
      $('#iFormTabBatch').classList.toggle('active', temp.formTab==='batch');
      $('#iSingleFields').style.display=temp.formTab==='single'?'block':'none';
      $('#iBatchFields').style.display=temp.formTab==='batch'?'block':'none';
    }

    // form actions
    $('#iCategoryTrigger')?.addEventListener('click', openCategoryPicker);
    $('#iCatWheelCancel')?.addEventListener('click',()=>closeModal('iCategoryModal'));
    $('#iCatWheelConfirm')?.addEventListener('click',()=>{
      const c=(temp.wheelList||[])[temp.wheelIndex];
      if(c){ temp.selectedCategory=c.id; updateCategoryTrigger(); if(editTargetItem) updateEditCategoryUI(); }
      closeModal('iCategoryModal');
    });
    $('#iIconBtn')?.addEventListener('click', openIconPicker);
    $('#iBatchIconBtn')?.addEventListener('click', openIconPicker);
    $('#iExpiryDateTrigger')?.addEventListener('click',()=>openExpiryPicker('#iExpiryDate'));
    $('#iBatchExpiryDateTrigger')?.addEventListener('click',()=>openExpiryPicker('#iBatchExpiryDate'));
    $$('.i-date-row[data-target]').forEach(row=>{
      row.addEventListener('click',()=>openDatePicker(row.dataset.target, $(row.dataset.target).value));
    });
    $('#iAutoTakeOne')?.addEventListener('click',()=>$('#iAutoTakeOne').classList.toggle('on'));
    $('#iSaveItemBtn')?.addEventListener('click', saveItemForm);
    $('#iCancelItemBtn')?.addEventListener('click',()=>showSubpage('overview'));
    $('#iCancelItemBtn2')?.addEventListener('click',()=>showSubpage('overview'));

    // 计算方式标签高亮
    $$('input[name="calcMode"]').forEach(r=>{
      r.addEventListener('change',()=>{
        $$('input[name="calcMode"]').forEach(rr=>{
          if(rr.closest('.i-tab')) rr.closest('.i-tab').classList.toggle('active', rr.checked);
        });
      });
    });

    // batch total auto
    function updateBatchTotal(){
      const qty=Math.max(0, parseInt($('#iQty').value)||0);
      const price=Number($('#iBatchUnitPrice').value)||0;
      const totalEl=$('#iBatchTotalPrice');
      if(document.activeElement!==totalEl) totalEl.value=(qty*price).toFixed(2);
    }
    $('#iQty')?.addEventListener('input', updateBatchTotal);
    $('#iBatchUnitPrice')?.addEventListener('input', updateBatchTotal);
    $('#iQtyMinus')?.addEventListener('click',()=>{ $('#iQty').value=Math.max(0,(parseInt($('#iQty').value)||1)-1); updateBatchTotal(); });
    $('#iQtyPlus')?.addEventListener('click',()=>{ $('#iQty').value=(parseInt($('#iQty').value)||0)+1; updateBatchTotal(); });

    // categories page
    $('#iCatTabMy')?.addEventListener('click',()=>{ state.settings.catTab='my'; save(); renderCategoriesPage(); });
    $('#iCatTabSys')?.addEventListener('click',()=>{ state.settings.catTab='sys'; save(); renderCategoriesPage(); });
    $('#iAddPrimaryBtn')?.addEventListener('click',()=>openTextModal('新增一级分类','',addPrimaryCategory));
    // 分类搜索：输入实时过滤 + 放大镜按钮 + 回车
    $('#iCatSearch')?.addEventListener('input', runCatSearch);
    $('#iCatSearch')?.addEventListener('keydown', e=>{ if(e.key==='Enter'){ e.preventDefault(); runCatSearch(); } });
    $('#iCatSearchBtn')?.addEventListener('click', e=>{ e.preventDefault(); runCatSearch(); });

    // modal closes
    $$('.i-modal').forEach(modal=>{
      modal.addEventListener('click', e=>{ if(e.target===modal) modal.classList.remove('show'); });
    });
    $$('[data-close-modal]').forEach(btn=>{
      btn.addEventListener('click',()=>{ const id=btn.dataset.closeModal; if(id) closeModal(id); });
    });
    $('#iDateConfirm')?.addEventListener('click', confirmDatePicker);
    $('#iExpiryConfirm')?.addEventListener('click', confirmExpiryPicker);
    $$('#iExpiryUnits button').forEach(b=>b.addEventListener('click',()=>setExpiryUnit(b.dataset.unit)));
    $('#iTextModalCancel')?.addEventListener('click',()=>closeModal('iTextModal'));
    $('#iIconTextModalCancel')?.addEventListener('click',()=>closeModal('iIconTextModal'));
    $('#iChildIconRow')?.addEventListener('click', openCatIconPicker);
  }

  /* ===== 初始化 ===== */
  function init(){
    load();
    bindEvents();
    showSubpage('overview');
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
