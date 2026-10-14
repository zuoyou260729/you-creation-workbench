/* ==========================================
   物品统计模块 · PersonalWorkbench Items v2
   ========================================== */
(function () {
  'use strict';
  window.APP_VERSION = 'v108';   // 与 sw.js 的 CACHE 版本保持一致，用于同步弹窗显示

  // 移动端视图判断（与 app.js 的 isMobile 同步：<=767px 走底部标签栏 + 系统返回手势）
  const isMobileView = () => !!(window.matchMedia && window.matchMedia('(max-width: 767px)').matches);
  // 当前物品模块所在子页（overview/categories/expiring），供详情页压入 history 时记录层级
  let currentItemsSub = 'overview';
  function isDetailOpen(){
    const el = document.getElementById('i-subpage-detail');
    return !!(el && el.classList.contains('active'));
  }

  // 弹窗栈：记录当前打开的弹窗 id（栈顶 = 最近打开）。移动端下每打开一个弹窗压一层 history，
  // 使系统边缘滑动返回能「逐级关闭弹窗 → 返回详情/列表」，而非直接穿透到上一级页面。
  const modalNav = {
    stack: [],
    hasOpen(){ return this.stack.length > 0; },
    closeTop(){ const id=this.stack.pop(); if(id){ const el=document.getElementById(id); if(el) el.classList.remove('show'); } },
    remove(id){ const i=this.stack.indexOf(id); if(i>=0) this.stack.splice(i,1); }
  };
  window.ItemsModal = modalNav;

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
    { id:'sys_virtual', name:'虚拟产品', icon:'🎫' },
    { id:'sys_digital', name:'数码产品', icon:'📱' },
    { id:'sys_smarthome', name:'智能家居', icon:'🏡' },
    { id:'sys_clothing', name:'衣服鞋包', icon:'👕' },
    { id:'sys_beauty', name:'个护美妆', icon:'💄' },
    { id:'sys_appliance', name:'家用电器', icon:'📺' },
    { id:'sys_home', name:'家居日用', icon:'🛋' },
    { id:'sys_consumable', name:'耗品配件', icon:'🔩' },
    { id:'sys_office', name:'办公学习', icon:'📚' },
    { id:'sys_outdoor', name:'户外运动', icon:'⛺' },
    { id:'sys_baby', name:'母婴儿童', icon:'🍼' },
    { id:'sys_transport', name:'交通出行', icon:'🚲' },
    { id:'sys_medical', name:'健康医疗', icon:'💊' },
    { id:'sys_collection', name:'收藏爱好', icon:'🎸' },
    { id:'sys_pet', name:'宠物用品', icon:'🐕' },
    { id:'sys_hardware', name:'家装五金', icon:'🔧' },
    { id:'sys_asset', name:'固定资产', icon:'🏠' },
    { id:'sys_service', name:'服务项目', icon:'🛎' },
    { id:'sys_snack', name:'零食饮料', icon:'🍿' },
    { id:'sys_tea', name:'酒咖品茗', icon:'🍵' },
    { id:'sys_other', name:'其他', icon:'📦' }
  ];

  const SYSTEM_SECONDARY = {
    sys_digital: ['手机','笔记本电脑','台式电脑','平板电脑','相机','镜头','无人机','NAS','路由器','键盘','鼠标','显示器','打印机','音箱','耳机','健身手环','游戏机','投影设备','电子书','充电宝','硬盘','固态硬盘','U盘','存储卡','CPU','显卡','主板','内存条','散热器','风扇','电源','机箱','音频设备','智能眼镜',null,'充电器','数据线','扩展坞','其他','云台','智能手表','复印机','口袋相机','手柄','蓝牙耳机'], // 投影仪→投影设备(原地改名)；末尾追加 云台/智能手表/复印机/口袋相机/手柄/蓝牙耳机(显示时「其他」置底)
    sys_smarthome: ['传感器','电动窗帘','电动晾衣架','摄像头','智能插座','智能开关','智能音箱','中控屏','中枢网关','其他'], // v68 新增一级分类
    sys_clothing: [null,'衬衫','毛衣','卫衣','外套','羽绒服','西装','裤子',null,'半身裙','连衣裙','内衣','袜子','运动鞋','靴子','拖鞋','双肩包','手提包','钱包','帽子','围巾','手套','腰带','其他','半袖','长袖','短裤','高跟鞋','皮鞋','领带','睡衣','眼镜墨镜'], // 下标0=T恤、下标8=牛仔裤 已删除(null占位，保持其余下标不变)
    sys_beauty: ['洁面','爽肤水','精华','乳液','面霜','防晒','面膜','眼霜',null,'香水','剃须刀','洗发护发','身体护理','女性护理','口腔护理','饰品','其他','梳子','香氛','卸妆油','修容','眼妆','定妆用品','粉底液','口红','腮红','上妆产品','化妆刷','隐形眼镜','美发用品','护肤工具','发圈'], // 下标8=彩妆 已删除(null占位，保持其余下标不变)
    sys_appliance: ['冰箱','洗衣机','烘干机','空调','电视','热水器','油烟机','洗碗机','微波炉','电磁炉','烤箱','电饭煲','空气炸锅','咖啡机','破壁机','吸尘器','扫地机器人','空气净化器','加湿器','电风扇','吹风机','洗地机','其他','电动打蛋器','绞肉机','搅面机','烤面包机','净水机','前置净水器','软水机','洗烘套装','饮水机','烧水壶'],
    sys_home: ['沙发','床','床垫','桌子','椅子','柜子','收纳','衣架','雨伞','厨具','餐具','清洁用品','洗衣用品','茶几','灯具','家纺','其他','地毯','洗护用品','四件套','坐垫靠垫','手帕纸','厨房湿巾','厨房用纸','净水机滤芯','滤网套','清洁膏','软水盐','手套','湿厕纸','洗洁精','洗脸巾','洗碗擦','洗碗盐','香皂肥皂','消毒液','油污净'],
    sys_consumable: ['边刷','玻璃水','车载香薰','地板清洁液','滚刷','集尘袋','滤网','滤芯','毛发切割器','拖布','吸尘器替换头','吸尘器延长杆','其他'], // v87 新增一级分类（位置在家居日用与办公学习之间）
    sys_office: ['书籍','计算器','书写用品','绘画工具','办公用品',null,null,'收纳用品','其他','裁切粘贴','电脑包','书包','学习仪器'],
    sys_outdoor: ['帐篷',null,'睡袋垫子','徒步登山','电器照明','钓鱼用品','球类用品','健身用品','滑雪用品','游泳用品','攀岩用品','救生用品','其他','露营用品','骑行用品','冰上运动','极限运动'],
    sys_baby: ['婴儿车','安全座椅','婴儿床','奶瓶','奶粉','纸尿裤','纸巾湿巾','童装','童鞋','玩具','绘本','孕妇用品','其他','儿童补剂','儿童餐具','平衡车','辅食','婴儿湿巾'],
    sys_transport: ['自行车','电动车','摩托车','头盔','行李箱',null,null,'其他','便携用品','汽车'],
    sys_medical: ['药品','急救用品','温度计','血压计','血糖仪','体重秤','按摩器械',null,null,'助听器',null,'手术','其他'], // 下标10=美容 已移至服务项目(null占位，保持其余下标不变)
    sys_collection: ['手办盲盒','卡牌','邮票','纪念币','吧唧','微缩模型',null,'唱片','艺术品','其他','棉花娃娃','娃衣','冰箱贴'],
    sys_pet: ['宠物粮','饭盆水盆','猫砂','背包','牵引绳','玩具','洗护用品','宠物窝','宠物服饰','其他','宠物零食','冻干','罐头','航空箱','垃圾袋','美容用品','驱虫用品','洗护记录','消毒除臭','自动喂食(水)器','补剂药品','洗护设备'],
    sys_hardware: ['家装余料',null,null,null,null,'花洒',null,null,null,'门锁','家装工具','其他','下水多通','进水三通'],
    sys_asset: ['车辆','房屋',null,'商铺','车位','其他'], // 下标2=公寓 已删除(null占位，保持其余下标不变)；住宅→房屋、其他资产→其他 为原地改名
    sys_service: ['课程培训','保险服务','其他服务','家政服务','体检健康','美容'], // v71 追加 家政服务/体检健康/美容（美容自健康医疗移入）；显示层「其他服务」置底
    sys_virtual: [null,'会员订阅','其他虚拟','账号密码'], // 下标0=游戏点卡 已删除(null占位，保持其余下标不变)；v104 末尾追加「账号密码」（「其他虚拟」显示层仍置底 → 界面顺序：会员订阅→账号密码→其他虚拟）
    sys_snack: ['干果','面包零食','乳制品','饮料','其他'], // v71 新增一级分类
    sys_tea: ['茶叶','酒水','咖啡','其他'], // v71 新增一级分类
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
    'sys_appliance:电动打蛋器':'assets/items/icons/sys_appliance_电动打蛋器.png',
    'sys_appliance:绞肉机':'assets/items/icons/sys_appliance_绞肉机.png',
    'sys_appliance:搅面机':'assets/items/icons/sys_appliance_搅面机.png',
    'sys_appliance:烤面包机':'assets/items/icons/sys_appliance_烤面包机.png',
    'sys_appliance:净水机':'assets/items/icons/sys_appliance_净水机.png',
    'sys_appliance:前置净水器':'assets/items/icons/sys_appliance_前置净水器.png',
    'sys_appliance:软水机':'assets/items/icons/sys_appliance_软水机.png',
    'sys_appliance:洗烘套装':'assets/items/icons/sys_appliance_洗烘套装.png',
    'sys_appliance:饮水机':'assets/items/icons/sys_appliance_饮水机.png',
    'sys_appliance:烧水壶':'assets/items/icons/sys_appliance_烧水壶.png',
    'sys_asset:房屋':'assets/items/icons/sys_asset_房屋.png',
    'sys_asset:其他':'assets/items/icons/sys_asset_其他.png',
    'sys_asset:商铺':'assets/items/icons/sys_asset_商铺.png',
    'sys_asset:车位':'assets/items/icons/sys_asset_车位.png',
    'sys_asset:车辆':'assets/items/icons/sys_asset_车辆.png',
    'sys_baby:其他':'assets/items/icons/sys_baby_其他.png',
    'sys_baby:奶瓶':'assets/items/icons/sys_baby_奶瓶.png',
    'sys_baby:婴儿床':'assets/items/icons/sys_baby_婴儿床.png',
    'sys_baby:婴儿车':'assets/items/icons/sys_baby_婴儿车.png',
    'sys_baby:孕妇用品':'assets/items/icons/sys_baby_孕妇用品.png',
    'sys_baby:安全座椅':'assets/items/icons/sys_baby_安全座椅.png',
    'sys_baby:纸巾湿巾':'assets/items/icons/sys_baby_纸巾湿巾.png',
    'sys_baby:玩具':'assets/items/icons/sys_baby_玩具.png',
    'sys_baby:童装':'assets/items/icons/sys_baby_童装.png',
    'sys_baby:童鞋':'assets/items/icons/sys_baby_童鞋.png',
    'sys_baby:纸尿裤':'assets/items/icons/sys_baby_纸尿裤.png',
    'sys_baby:绘本':'assets/items/icons/sys_baby_绘本.png',
    'sys_baby:奶粉':'assets/items/icons/sys_baby_奶粉.png',
    'sys_baby:儿童补剂':'assets/items/icons/sys_baby_儿童补剂.png',
    'sys_baby:儿童餐具':'assets/items/icons/sys_baby_儿童餐具.png',
    'sys_baby:平衡车':'assets/items/icons/sys_baby_平衡车.png',
    'sys_baby:辅食':'assets/items/icons/sys_baby_辅食.png',
    'sys_baby:婴儿湿巾':'assets/items/icons/sys_baby_婴儿湿巾.png',
    'sys_beauty:乳液':'assets/items/icons/sys_beauty_乳液.png',
    'sys_beauty:其他':'assets/items/icons/sys_beauty_其他.png',
    'sys_beauty:剃须刀':'assets/items/icons/sys_beauty_剃须刀.png',
    'sys_beauty:口腔护理':'assets/items/icons/sys_beauty_口腔护理.png',
    'sys_beauty:女性护理':'assets/items/icons/sys_beauty_女性护理.png',
    'sys_beauty:饰品':'assets/items/icons/sys_beauty_饰品.png',
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
    'sys_beauty:梳子':'assets/items/icons/sys_beauty_梳子.png',
    'sys_beauty:香氛':'assets/items/icons/sys_beauty_香氛.png',
    'sys_beauty:卸妆油':'assets/items/icons/sys_beauty_卸妆油.png',
    'sys_beauty:修容':'assets/items/icons/sys_beauty_修容.png',
    'sys_beauty:眼妆':'assets/items/icons/sys_beauty_眼妆.png',
    'sys_beauty:定妆用品':'assets/items/icons/sys_beauty_定妆用品.png',
    'sys_beauty:粉底液':'assets/items/icons/sys_beauty_粉底液.png',
    'sys_beauty:口红':'assets/items/icons/sys_beauty_口红.png',
    'sys_beauty:腮红':'assets/items/icons/sys_beauty_腮红.png',
    'sys_beauty:上妆产品':'assets/items/icons/sys_beauty_上妆产品.png',
    'sys_beauty:化妆刷':'assets/items/icons/sys_beauty_化妆刷.png',
    'sys_beauty:隐形眼镜':'assets/items/icons/sys_beauty_隐形眼镜.png',
    'sys_beauty:美发用品':'assets/items/icons/sys_beauty_美发用品.png',
    'sys_beauty:护肤工具':'assets/items/icons/sys_beauty_护肤工具.png',
    'sys_beauty:发圈':'assets/items/icons/sys_beauty_发圈.png',
    'sys_clothing:内衣':'assets/items/icons/sys_clothing_内衣.png',
    'sys_clothing:半身裙':'assets/items/icons/sys_clothing_半身裙.png',
    'sys_clothing:卫衣':'assets/items/icons/sys_clothing_卫衣.png',
    'sys_clothing:双肩包':'assets/items/icons/sys_clothing_雨鞋.png',
    'sys_clothing:围巾':'assets/items/icons/sys_clothing_围巾.png',
    'sys_clothing:外套':'assets/items/icons/sys_clothing_外套.png',
    'sys_clothing:帽子':'assets/items/icons/sys_clothing_帽子.png',
    'sys_clothing:手套':'assets/items/icons/sys_clothing_手套.png',
    'sys_clothing:手提包':'assets/items/icons/sys_clothing_双肩包.png',
    'sys_clothing:拖鞋':'assets/items/icons/sys_clothing_拖鞋.png',
    'sys_clothing:毛衣':'assets/items/icons/sys_clothing_毛衣.png',
    'sys_clothing:腰带':'assets/items/icons/sys_clothing_腰带.png',
    'sys_clothing:羽绒服':'assets/items/icons/sys_clothing_羽绒服.png',
    'sys_clothing:衬衫':'assets/items/icons/sys_clothing_衬衫.png',
    'sys_clothing:袜子':'assets/items/icons/sys_clothing_袜子.png',
    'sys_clothing:裤子':'assets/items/icons/sys_clothing_裤子.png',
    'sys_clothing:西装':'assets/items/icons/sys_clothing_西装.png',
    'sys_clothing:运动鞋':'assets/items/icons/sys_clothing_运动鞋.png',
    'sys_clothing:连衣裙':'assets/items/icons/sys_clothing_连衣裙.png',
    'sys_clothing:钱包':'assets/items/icons/sys_clothing_手提包.png',
    'sys_clothing:雨鞋':'assets/items/icons/sys_clothing_雨鞋.png',
    'sys_clothing:其他':'assets/items/icons/sys_clothing_皮带.png',
    'sys_clothing:靴子':'assets/items/icons/sys_clothing_靴子.png',
    'sys_clothing:半袖':'assets/items/icons/sys_clothing_半袖.png',
    'sys_clothing:长袖':'assets/items/icons/sys_clothing_长袖.png',
    'sys_clothing:短裤':'assets/items/icons/sys_clothing_短裤.png',
    'sys_clothing:高跟鞋':'assets/items/icons/sys_clothing_高跟鞋.png',
    'sys_clothing:皮鞋':'assets/items/icons/sys_clothing_皮鞋.png',
    'sys_clothing:领带':'assets/items/icons/sys_clothing_领带.png',
    'sys_clothing:睡衣':'assets/items/icons/sys_clothing_睡衣.png',
    'sys_clothing:眼镜墨镜':'assets/items/icons/sys_clothing_眼镜墨镜.png',
    'sys_collection:其他':'assets/items/icons/sys_collection_其他.png',
    'sys_collection:卡牌':'assets/items/icons/sys_collection_卡牌.png',
    'sys_collection:唱片':'assets/items/icons/sys_collection_唱片.png',
    'sys_collection:吧唧':'assets/items/icons/sys_collection_吧唧.png',
    'sys_collection:手办盲盒':'assets/items/icons/sys_collection_手办盲盒.png',
    'sys_collection:微缩模型':'assets/items/icons/sys_collection_微缩模型.png',
    'sys_collection:纪念币':'assets/items/icons/sys_collection_纪念币.png',
    'sys_collection:艺术品':'assets/items/icons/sys_collection_艺术品.png',
    'sys_collection:邮票':'assets/items/icons/sys_collection_邮票.png',
    'sys_collection:棉花娃娃':'assets/items/icons/sys_collection_棉花娃娃.png',
    'sys_collection:娃衣':'assets/items/icons/sys_collection_娃衣.png',
    'sys_collection:冰箱贴':'assets/items/icons/sys_collection_冰箱贴.png',
    'sys_digital:CPU':'assets/items/icons/sys_digital_CPU.png',
    'sys_digital:NAS':'assets/items/icons/sys_digital_NAS.png',
    'sys_digital:U盘':'assets/items/icons/sys_digital_U盘.png',
    'sys_digital:主板':'assets/items/icons/sys_digital_主板.png',
    'sys_digital:充电宝':'assets/items/icons/sys_digital_充电宝.png',
    'sys_digital:内存条':'assets/items/icons/sys_digital_内存条.png',
    'sys_digital:加湿器':'assets/items/icons/sys_digital_加湿器.png',
    'sys_digital:台式电脑':'assets/items/icons/sys_digital_台式电脑.png',
    'sys_digital:固态硬盘':'assets/items/icons/sys_digital_固态硬盘.png',
    'sys_digital:存储卡':'assets/items/icons/sys_digital_存储卡.png',
    'sys_digital:平板电脑':'assets/items/icons/sys_digital_平板电脑.png',
    'sys_digital:手机':'assets/items/icons/sys_digital_手机.png',
    'sys_digital:打印机':'assets/items/icons/sys_digital_打印机.png',
    'sys_digital:投影设备':'assets/items/icons/sys_digital_投影设备.png',
    'sys_digital:散热器':'assets/items/icons/sys_digital_散热器.png',
    'sys_digital:无人机':'assets/items/icons/sys_digital_无人机.png',
    'sys_digital:显卡':'assets/items/icons/sys_digital_显卡.png',
    'sys_digital:显示器':'assets/items/icons/sys_digital_显示器.png',
    'sys_digital:健身手环':'assets/items/icons/sys_digital_健身手环.png',
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
    'sys_digital:充电器':'assets/items/icons/sys_digital_充电器.png',
    'sys_digital:数据线':'assets/items/icons/sys_digital_数据线.png',
    'sys_digital:扩展坞':'assets/items/icons/sys_digital_扩展坞.png',
    'sys_digital:其他':'assets/items/icons/sys_digital_其他.png',
    'sys_digital:云台':'assets/items/icons/sys_digital_云台.png',
    'sys_digital:智能手表':'assets/items/icons/sys_digital_智能手表.png',
    'sys_digital:复印机':'assets/items/icons/sys_digital_复印机.png',
    'sys_digital:口袋相机':'assets/items/icons/sys_digital_口袋相机.png',
    'sys_digital:手柄':'assets/items/icons/sys_digital_手柄.png',
    'sys_digital:蓝牙耳机':'assets/items/icons/sys_digital_蓝牙耳机.png',
    'sys_smarthome:传感器':'assets/items/icons/sys_smarthome_传感器.png',
    'sys_smarthome:电动窗帘':'assets/items/icons/sys_smarthome_电动窗帘.png',
    'sys_smarthome:电动晾衣架':'assets/items/icons/sys_smarthome_电动晾衣架.png',
    'sys_smarthome:摄像头':'assets/items/icons/sys_smarthome_摄像头.png',
    'sys_smarthome:智能插座':'assets/items/icons/sys_smarthome_智能插座.png',
    'sys_smarthome:智能开关':'assets/items/icons/sys_smarthome_智能开关.png',
    'sys_smarthome:智能音箱':'assets/items/icons/sys_smarthome_智能音箱.png',
    'sys_smarthome:中控屏':'assets/items/icons/sys_smarthome_中控屏.png',
    'sys_smarthome:中枢网关':'assets/items/icons/sys_smarthome_中枢网关.png',
    'sys_smarthome:其他':'assets/items/icons/sys_smarthome_其他.png',
    'sys_hardware:其他':'assets/items/icons/sys_hardware_其他.png',
    'sys_hardware:家装工具':'assets/items/icons/sys_hardware_家装工具.png',
    'sys_hardware:家装余料':'assets/items/icons/sys_hardware_家装余料.png',
    'sys_hardware:下水多通':'assets/items/icons/sys_hardware_下水多通.png',
    'sys_hardware:门锁':'assets/items/icons/sys_hardware_智能门锁.png',
    'sys_hardware:花洒':'assets/items/icons/sys_hardware_花洒.png',
    'sys_hardware:进水三通':'assets/items/icons/sys_hardware_进水三通.png',
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
    'sys_home:清洁用品':'assets/items/icons/sys_home_清洁用品.png',
    'sys_home:地毯':'assets/items/icons/sys_home_地毯.png',
    'sys_home:洗护用品':'assets/items/icons/sys_home_洗护用品.png',
    'sys_home:四件套':'assets/items/icons/sys_home_四件套.png',
    'sys_home:坐垫靠垫':'assets/items/icons/sys_home_坐垫靠垫.png',
    'sys_home:灯具':'assets/items/icons/sys_home_灯具.png',
    'sys_home:茶几':'assets/items/icons/sys_home_茶几.png',
    'sys_home:衣架':'assets/items/icons/sys_home_衣架.png',
    'sys_home:雨伞':'assets/items/icons/sys_home_雨伞.png',
    'sys_home:餐具':'assets/items/icons/sys_home_餐具.png',
    'sys_home:手帕纸':'assets/items/icons/sys_home_手帕纸.png',
    'sys_home:厨房湿巾':'assets/items/icons/sys_home_厨房湿巾.png',
    'sys_home:厨房用纸':'assets/items/icons/sys_home_厨房用纸.png',
    'sys_home:净水机滤芯':'assets/items/icons/sys_home_净水机滤芯.png',
    'sys_home:滤网套':'assets/items/icons/sys_home_滤网套.png',
    'sys_home:清洁膏':'assets/items/icons/sys_home_清洁膏.png',
    'sys_home:软水盐':'assets/items/icons/sys_home_软水盐.png',
    'sys_home:手套':'assets/items/icons/sys_home_手套.png',
    'sys_home:湿厕纸':'assets/items/icons/sys_home_湿厕纸.png',
    'sys_home:洗洁精':'assets/items/icons/sys_home_洗洁精.png',
    'sys_home:洗脸巾':'assets/items/icons/sys_home_洗脸巾.png',
    'sys_home:洗碗擦':'assets/items/icons/sys_home_洗碗擦.png',
    'sys_home:洗碗盐':'assets/items/icons/sys_home_洗碗盐.png',
    'sys_home:香皂肥皂':'assets/items/icons/sys_home_香皂肥皂.png',
    'sys_home:消毒液':'assets/items/icons/sys_home_消毒液.png',
    'sys_home:油污净':'assets/items/icons/sys_home_油污净.png',
    'sys_consumable:边刷':'assets/items/icons/sys_consumable_边刷.png',
    'sys_consumable:玻璃水':'assets/items/icons/sys_consumable_玻璃水.png',
    'sys_consumable:车载香薰':'assets/items/icons/sys_consumable_车载香薰.png',
    'sys_consumable:地板清洁液':'assets/items/icons/sys_consumable_地板清洁液.png',
    'sys_consumable:滚刷':'assets/items/icons/sys_consumable_滚刷.png',
    'sys_consumable:集尘袋':'assets/items/icons/sys_consumable_集尘袋.png',
    'sys_consumable:滤网':'assets/items/icons/sys_consumable_滤网.png',
    'sys_consumable:滤芯':'assets/items/icons/sys_consumable_滤芯.png',
    'sys_consumable:毛发切割器':'assets/items/icons/sys_consumable_毛发切割器.png',
    'sys_consumable:拖布':'assets/items/icons/sys_consumable_拖布.png',
    'sys_consumable:吸尘器替换头':'assets/items/icons/sys_consumable_吸尘器替换头.png',
    'sys_consumable:吸尘器延长杆':'assets/items/icons/sys_consumable_吸尘器延长杆.png',
    'sys_consumable:其他':'assets/items/icons/sys_consumable_其他.png',
    'sys_medical:温度计':'assets/items/icons/sys_medical_温度计.png',
    'sys_medical:体重秤':'assets/items/icons/sys_medical_体重秤.png',
    'sys_medical:其他':'assets/items/icons/sys_medical_其他.png',
    'sys_medical:助听器':'assets/items/icons/sys_medical_助听器.png',
    'sys_service:美容':'assets/items/icons/sys_service_美容.png',
    'sys_medical:急救用品':'assets/items/icons/sys_medical_急救用品.png',
    'sys_medical:手术':'assets/items/icons/sys_medical_手术.png',
    'sys_medical:按摩器械':'assets/items/icons/sys_medical_按摩器械.png',
    'sys_medical:药品':'assets/items/icons/sys_medical_药品.png',
    'sys_medical:血压计':'assets/items/icons/sys_medical_血压计.png',
    'sys_medical:血糖仪':'assets/items/icons/sys_medical_血糖仪.png',
    'sys_office:书写用品':'assets/items/icons/sys_office_书写用品.png',
    'sys_office:书籍':'assets/items/icons/sys_office_书.png',
    'sys_office:其他':'assets/items/icons/sys_office_其他.png',
    'sys_office:办公用品':'assets/items/icons/sys_office_办公用品.png',
    'sys_office:收纳用品':'assets/items/icons/sys_office_收纳用品.png',
    'sys_office:裁切粘贴':'assets/items/icons/sys_office_裁切粘贴.png',
    'sys_office:电脑包':'assets/items/icons/sys_office_电脑包.png',
    'sys_office:书包':'assets/items/icons/sys_office_书包.png',
    'sys_office:学习仪器':'assets/items/icons/sys_office_学习仪器.png',
    'sys_office:绘画工具':'assets/items/icons/sys_office_绘画工具.png',
    'sys_office:计算器':'assets/items/icons/sys_office_计算器.png',
    'sys_other:礼品':'assets/items/icons/sys_other_礼品.png',
    'sys_other:票券':'assets/items/icons/sys_other_票券.png',
    'sys_outdoor:健身用品':'assets/items/icons/sys_outdoor_健身用品.png',
    'sys_outdoor:帐篷':'assets/items/icons/sys_outdoor_帐篷.png',
    'sys_outdoor:徒步登山':'assets/items/icons/sys_outdoor_徒步登山.png',
    'sys_outdoor:攀岩用品':'assets/items/icons/sys_outdoor_攀岩用品.png',
    'sys_outdoor:游泳用品':'assets/items/icons/sys_outdoor_游泳用品.png',
    'sys_outdoor:滑雪用品':'assets/items/icons/sys_outdoor_滑雪用品.png',
    'sys_outdoor:球类用品':'assets/items/icons/sys_outdoor_球类用品.png',
    'sys_outdoor:电器照明':'assets/items/icons/sys_outdoor_电器照明.png',
    'sys_outdoor:睡袋垫子':'assets/items/icons/sys_outdoor_睡袋垫子.png',
    'sys_outdoor:钓鱼用品':'assets/items/icons/sys_outdoor_钓鱼用品.png',
    'sys_outdoor:救生用品':'assets/items/icons/sys_outdoor_救生用品.png',
    'sys_outdoor:露营用品':'assets/items/icons/sys_outdoor_露营用品.png',
    'sys_outdoor:骑行用品':'assets/items/icons/sys_outdoor_骑行用品.png',
    'sys_outdoor:冰上运动':'assets/items/icons/sys_outdoor_冰上运动.png',
    'sys_outdoor:极限运动':'assets/items/icons/sys_outdoor_极限运动.png',
    'sys_pet:其他':'assets/items/icons/sys_pet_其他.png',
    'sys_pet:背包':'assets/items/icons/sys_pet_背包.png',
    'sys_pet:宠物服饰':'assets/items/icons/sys_pet_宠物衣服.png',
    'sys_pet:宠物窝':'assets/items/icons/sys_pet_宠物窝.png',
    'sys_pet:宠物粮':'assets/items/icons/sys_pet_宠物粮.png',
    'sys_pet:宠物零食':'assets/items/icons/sys_pet_宠物零食.png',
    'sys_pet:洗护用品':'assets/items/icons/sys_pet_洗护用品.png',
    'sys_pet:洗护记录':'assets/items/icons/sys_pet_洗护记录.png',
    'sys_pet:洗护设备':'assets/items/icons/sys_pet_洗护设备.png',
    'sys_pet:牵引绳':'assets/items/icons/sys_pet_牵引绳.png',
    'sys_pet:猫砂':'assets/items/icons/sys_pet_猫砂.png',
    'sys_pet:玩具':'assets/items/icons/sys_pet_玩具.png',
    'sys_pet:美容用品':'assets/items/icons/sys_pet_美容用品.png',
    'sys_pet:补剂药品':'assets/items/icons/sys_pet_补剂药品.png',
    'sys_pet:航空箱':'assets/items/icons/sys_pet_航空箱.png',
    'sys_pet:消毒除臭':'assets/items/icons/sys_pet_消毒除臭.png',
    'sys_pet:罐头':'assets/items/icons/sys_pet_罐头.png',
    'sys_pet:自动喂食(水)器':'assets/items/icons/sys_pet_自动喂食(水)器.png',
    'sys_pet:驱虫用品':'assets/items/icons/sys_pet_驱虫用品.png',
    'sys_pet:垃圾袋':'assets/items/icons/sys_pet_垃圾袋.png',
    'sys_pet:饭盆水盆':'assets/items/icons/sys_pet_饭盆水盆.png',
    'sys_pet:冻干':'assets/items/icons/sys_pet_冻干.png',
    'sys_service:课程培训':'assets/items/icons/sys_service_课程培训.png',
    // —— 补齐此前因相对高度阈值被漏提的二级图标 ——
    'sys_transport:自行车':'assets/items/icons/sys_transport_自行车.png',
    'sys_transport:电动车':'assets/items/icons/sys_transport_电动车.png',
    'sys_transport:摩托车':'assets/items/icons/sys_transport_摩托车.png',
    'sys_transport:头盔':'assets/items/icons/sys_transport_头盔.png',
    'sys_transport:行李箱':'assets/items/icons/sys_transport_行李箱.png',
    'sys_transport:其他':'assets/items/icons/sys_transport_其他.png',
    'sys_transport:便携用品':'assets/items/icons/sys_transport_便携用品.png',
    'sys_transport:汽车':'assets/items/icons/sys_transport_汽车.png',
    'sys_service:保险服务':'assets/items/icons/sys_service_保险服务.png',
    'sys_service:其他服务':'assets/items/icons/sys_service_其他服务.png',
    'sys_service:家政服务':'assets/items/icons/sys_service_家政服务.png',
    'sys_service:体检健康':'assets/items/icons/sys_service_体检健康.png',
    'sys_virtual:会员订阅':'assets/items/icons/sys_virtual_会员订阅.png',
    'sys_virtual:其他虚拟':'assets/items/icons/sys_virtual_其他虚拟.png',
    'sys_virtual:账号密码':'assets/items/icons/sys_virtual_账号密码.png',
    'sys_snack:干果':'assets/items/icons/sys_snack_干果.png',
    'sys_snack:面包零食':'assets/items/icons/sys_snack_面包零食.png',
    'sys_snack:乳制品':'assets/items/icons/sys_snack_乳制品.png',
    'sys_snack:饮料':'assets/items/icons/sys_snack_饮料.png',
    'sys_snack:其他':'assets/items/icons/sys_snack_其他.png',
    'sys_tea:茶叶':'assets/items/icons/sys_tea_茶叶.png',
    'sys_tea:酒水':'assets/items/icons/sys_tea_酒水.png',
    'sys_tea:咖啡':'assets/items/icons/sys_tea_咖啡.png',
    'sys_tea:其他':'assets/items/icons/sys_tea_其他.png'
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
  // 稳定短哈希：用于给缺失 id 的旧数据补一个【确定性】id（两端算出同一个，避免重复）
  function hash32(str){
    let h=2166136261>>>0;
    str=String(str||'');
    for(let i=0;i<str.length;i++){ h^=str.charCodeAt(i); h=Math.imul(h,16777619); }
    return (h>>>0).toString(36);
  }
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
    // 回填缺失的 id/updatedAt（旧数据），并落盘，避免同步时整条被丢弃
    if(ensureSyncMeta()){ try{ save(); }catch(e){} }
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
  // 批次实际单价：优先 unitPrice；旧数据常只填了总价（unitPrice=0），此时用 总价/数量 回推
  function batchUnitPrice(b){
    if(!b) return 0;
    const up=Number(b.unitPrice)||0;
    if(up>0) return up;
    const q=Number(b.quantity)||0;
    if(q>0) return (Number(b.totalPrice)||0)/q;
    return 0;
  }
  // 平均每日成本（v80 改）：只按【已取用】物品的价值计算 ——
  // 单个物品：无取用记录不计；批量物品：Σ(批次单价 × 该批次已取用数量)，
  // 例：10件×¥2、已取用3件 → 分子为 ¥6，再除以有效天数
  function getItemDailyCost(item){
    const all=getActiveBatches(item);
    const bs=all.filter(b=>b.expiryDate);
    if(!bs.length) return 0;
    const minExp=bs.map(b=>b.expiryDate).sort()[0];
    const firstDate=all.map(b=>b.date).filter(Boolean).sort()[0];
    if(!firstDate || !minExp) return 0;
    const days=daysDiffInclusive(firstDate, minExp);
    if(days<=0) return 0;
    const usings=getItemUsings(item);
    const usedValue=all.reduce((s,b)=>{
      const used=usings.filter(u=>u.batchId===b.id).reduce((x,u)=>x+(Number(u.quantity)||0),0);
      return s+batchUnitPrice(b)*used;
    },0);
    if(usedValue<=0) return 0;   // 没有已取用的物品 → 日均成本为 0
    return usedValue/days;
  }

  /* ===== 分类相关 ===== */
  function getSystemSecondary(pid){
    const list=(SYSTEM_SECONDARY[pid]||[]).map((name,idx)=>({
      id:`${pid}_sub_${idx}`,
      name,
      icon: SYSTEM_ICON_MAP[`${pid}:${name}`] || emojiFor(name),
      parentId: pid,
      system: true
    })).filter(c=>c.name);
    // 显示顺序：把「其他」始终排在最后。仅调整展示顺序，id 仍按原数组下标生成，
    // 因此已有物品的分类关联不受影响（避免下标位移导致串类）。
    const oi=list.findIndex(c=>c.name==='其他'||c.name.indexOf('其他')===0);
    if(oi>=0 && oi<list.length-1) list.push(list.splice(oi,1)[0]);
    return list;
  }
  function emojiFor(name){
    const map={
      '手机':'📱','笔记本电脑':'💻','台式电脑':'🖥','平板电脑':'📱','相机':'📷','镜头':'🔍','无人机':'🚁','NAS':'💾','路由器':'📡','键盘':'⌨','鼠标':'🖱','显示器':'🖥','打印机':'🖨','音箱':'🔊','耳机':'🎧','游戏机':'🎮','投影设备':'📽','电子书':'📖','充电宝':'🔋','硬盘':'💾','固态硬盘':'💾','U盘':'💾','存储卡':'💾','CPU':'🧠','显卡':'🎮','主板':'🔌','散热器':'🌀','风扇':'🌀','电源':'🔌','机箱':'🖥','音频设备':'🎙','智能眼镜':'👓','加湿器':'💧','充电器':'🔌','数据线':'🔗','扩展坞':'🔌','健身手环':'⌚','内存条':'🧩','云台':'🎥','智能手表':'⌚','复印机':'🖨','口袋相机':'📷','手柄':'🎮','蓝牙耳机':'🎧',
      '传感器':'📡','电动窗帘':'🪟','电动晾衣架':'🧺','摄像头':'📹','智能插座':'🔌','智能开关':'💡','智能音箱':'🔊','中控屏':'📱','中枢网关':'📡',
      '衬衫':'👔','毛衣':'🧶','卫衣':'🧥','外套':'🧥','羽绒服':'🧥','西装':'🤵','裤子':'👖','半身裙':'👗','连衣裙':'👗','内衣':'👙','袜子':'🧦','运动鞋':'👟','靴子':'🥾','拖鞋':'🩴','雨鞋':'🌂','双肩包':'🎒','手提包':'👜','钱包':'👛','帽子':'🧢','围巾':'🧣','手套':'🧤','腰带':'🪢','半袖':'👕','长袖':'🥼','短裤':'🩳','高跟鞋':'👠','皮鞋':'👞','领带':'👔','睡衣':'🛌','眼镜墨镜':'🕶','其他':'📦',
      '洁面':'🧴','爽肤水':'🧴','精华':'🧴','乳液':'🧴','面霜':'🧴','防晒':'☀','面膜':'🧖','眼霜':'👁','香水':'🌸','剃须刀':'🪒','洗发护发':'🧴','身体护理':'🧴','女性护理':'🩸','口腔护理':'🦷','饰品':'💍',
      '梳子':'🪮','香氛':'🕯','卸妆油':'🧴','修容':'🎨','眼妆':'👁','定妆用品':'🧴','粉底液':'🧴','口红':'💄','腮红':'🌸','上妆产品':'🥚','化妆刷':'🖌','隐形眼镜':'👁','美发用品':'💈','护肤工具':'🧖','发圈':'🎀',
      '冰箱':'🧊','洗衣机':'🧺','烘干机':'🌀','空调':'❄','电视':'📺','热水器':'🔥','油烟机':'🌪','洗碗机':'🍽','微波炉':'📟','电磁炉':'🔥','烤箱':'🔥','电饭煲':'🍚','空气炸锅':'🍟','咖啡机':'☕','破壁机':'🥤','吸尘器':'🧹','扫地机器人':'🤖','空气净化器':'🌬','加湿器':'💧','电风扇':'🌀','吹风机':'💨','洗地机':'🧽','电动打蛋器':'🥚','绞肉机':'🥩','搅面机':'🥣','烤面包机':'🍞',
      '沙发':'🛋','床':'🛏','床垫':'🛏','桌子':'🪑','椅子':'🪑','柜子':'🗄','收纳':'📦','衣架':'👔','雨伞':'☂','厨具':'🍳','餐具':'🍽','清洁用品':'🧽','洗衣用品':'🧺','茶几':'🪑','灯具':'💡','家纺':'🛏','地毯':'🟫','四件套':'🛌','坐垫靠垫':'🛋',
      '手帕纸':'🧻','厨房湿巾':'🧻','厨房用纸':'🧻','净水机滤芯':'🚰','滤网套':'🕸','清洁膏':'🧴','软水盐':'🧂','手套':'🧤','湿厕纸':'🧻','洗洁精':'🧴','洗脸巾':'🧻','洗碗擦':'🧽','洗碗盐':'🧂','香皂肥皂':'🧼','消毒液':'🧴','油污净':'🧴',
      '边刷':'🧹','玻璃水':'🚿','车载香薰':'🕯','地板清洁液':'🧴','滚刷':'🧹','集尘袋':'🗑','滤网':'🕸','滤芯':'🚰','毛发切割器':'✂','拖布':'🧹','吸尘器替换头':'🧲','吸尘器延长杆':'📏',
      '书籍':'📚','计算器':'🧮','书写用品':'✏','绘画工具':'🎨','办公用品':'📎','收纳用品':'📦','裁切粘贴':'✂','电脑包':'💼','书包':'🎒','学习仪器':'🌐',
      '帐篷':'⛺','睡袋垫子':'🛌','徒步登山':'🥾','电器照明':'🔦','钓鱼用品':'🎣','球类用品':'🏸','健身用品':'🏋','滑雪用品':'🎿','游泳用品':'🏊','攀岩用品':'🧗','救生用品':'🛟','露营用品':'🏕','骑行用品':'🚲','冰上运动':'⛸','极限运动':'🪂',
      '婴儿车':'🍼','安全座椅':'💺','婴儿床':'🛏','奶瓶':'🍼','奶粉':'🥛','纸尿裤':'🧷','纸巾湿巾':'🧻','童装':'👶','童鞋':'👟','玩具':'🧸','绘本':'📖','孕妇用品':'🤰','儿童补剂':'💊','儿童餐具':'🥣','平衡车':'🛴','辅食':'🍲','婴儿湿巾':'🧻',
      '自行车':'🚲','电动车':'🛵','摩托车':'🏍','头盔':'⛑','行李箱':'🧳','便携用品':'🎒','汽车':'🚗',
      '药品':'💊','急救用品':'🩹','温度计':'🌡','血压计':'🩺','血糖仪':'🩸','体重秤':'⚖','按摩器械':'💆','助听器':'🦻','美容':'💉','手术':'🏥',
      '手办盲盒':'🧸','卡牌':'🃏','邮票':'💌','纪念币':'🪙','吧唧':'🏅','微缩模型':'🎁','唱片':'💿','艺术品':'🖼','棉花娃娃':'🐻','娃衣':'👗','冰箱贴':'🧲',
      '宠物粮':'🍖','饭盆水盆':'🥣','猫砂':'🧹','背包':'🎒','牵引绳':'🦮','玩具':'🎾','洗护用品':'🧴','宠物窝':'🏠','宠物服饰':'🎀','宠物零食':'🦴','冻干':'🍖','罐头':'🥫','航空箱':'🧳','垃圾袋':'🗑','美容用品':'✂','驱虫用品':'💊','洗护记录':'📅','消毒除臭':'🧼','自动喂食(水)器':'🚰','补剂药品':'💊','洗护设备':'🌀',
      '家装余料':'🪣','墙纸':'🖼','瓷砖':'⬜','地板':'🪵','水龙头':'🚰','花洒':'🚿','马桶':'🚽','水槽':'🚰','开关插座':'🔌','门锁':'🔒','家装工具':'🔧','下水多通':'🔩','进水三通':'🔩',
      '车辆':'🚗','房屋':'🏠','商铺':'🏪','车位':'🅿','其他':'📦',
      '课程培训':'📖','保险服务':'🛡','其他服务':'🤝','家政服务':'🧹','体检健康':'🩺',
      '会员订阅':'🎟','其他虚拟':'💾','账号密码':'🔑',
      '干果':'🥜','面包零食':'🥐','乳制品':'🥛','饮料':'🧃','茶叶':'🍵','酒水':'🍷','咖啡':'☕',
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
          maintenanceTotal:0,   // v92：累计维护支出（物品级累加）
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
      g.maintenanceTotal+=Number(item.maintenanceTotal||0);   // v92：本组各物品累计维护支出之和
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

  /* ===== 到期清单：按「批次」计算（有效期 - 今天 ≤ 5 天，含已过期）=====
     返回 [{item, hits:[{batch, delta, expired}]}]，hits 按剩余天数升序。 */
  function getExpiringBatchEntries(){
    const today=todayStr();
    const out=[];
    state.items.forEach(item=>{
      const batches=getItemBatches(item);
      const hits=[];
      batches.forEach(b=>{
        const exp=b.expiryDate||item.expiryDate;
        if(!exp) return;
        const delta=daysDiff(today, exp);
        if(delta<=5) hits.push({ batch:b, delta, expired:delta<0 });
      });
      if(hits.length){
        hits.sort((a,b)=>a.delta-b.delta);
        out.push({ item, hits });
      }
    });
    return out;
  }
  // 到期清单卡片：仅物品名称 + 符合条件的入库批次（竖向排列，可点击）
  // 采用「内联 onclick + 数组下标」而非 addEventListener：不依赖绑定时机，
  // 也不会因 id 匹配失败而静默 return（此前「点击无反应」的隐患点）。
  let expiringEntries=[];
  function expiringCardHtml(entry, idx){
    const { item, hits }=entry;
    return `
    <div class="i-exp-card">
      <div class="i-exp-name">${escapeHtml(item.name)}</div>
      <div class="i-exp-batches">
        ${hits.map((h,j)=>`<div class="i-exp-batch" onclick="__openExpBatch(${idx},${j})">${escapeHtml(h.batch.id)}</div>`).join('')}
      </div>
    </div>`;
  }
  // 全局入口：由卡片内联 onclick 调用，直接用下标取渲染时缓存的数据
  window.__openExpBatch=function(i,j){
    const e=expiringEntries[i];
    if(!e){ showToast('列表已更新，请返回后重新进入'); return; }
    const h=e.hits[j];
    if(!h) return;
    showBatchArchive(e.item, h.batch);
  };

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
    const entries=getExpiringBatchEntries();   // 与到期清单页同一套「按批次」判定
    if(entries.length===0){ el.style.display='none'; return; }
    el.style.display='block';
    const groups=groupItems(entries.map(x=>x.item)).groups;
    const max5=entries.slice(0,5);
    el.querySelector('.i-expiring-list').innerHTML=max5.map(x=>{
      const g=groups.find(gg=>gg.items.includes(x.item));
      if(!g) return '';
      const h=x.hits[0];   // 取最接近到期的那个批次
      return listCardHtml(g, h.expired, Math.abs(h.delta), h.expired);
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
      <button class="i-action-pin i-grid-pin ${g.pinned?'active':''}" data-key="${g.key}" aria-label="置顶">${pinSvg()}</button>
      <div class="i-grid-icon">${renderIcon(g.icon, g.name)}</div>
      <div class="i-grid-name">${escapeHtml(g.name)}</div>
      <div class="i-grid-daily"><span>¥</span><strong>${g.dailyCost.toFixed(2)}</strong><span>/日</span></div>
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
    if(['overview','categories','expiring','today'].includes(name)) currentItemsSub=name;
    if(name==='today') renderTodayPage();
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
    if(el){
      const n=getExpiringBatchEntries().length;   // 与到期清单页一致：按批次判定后的物品数
      if(n>0){ el.textContent=n>99?'99+':String(n); el.style.display='inline-flex'; }
      else el.style.display='none';
    }
    updateTodayBadge();   // v99：今日待办角标一并刷新
  }

  /* ===== 添加物品 ===== */
  /* ==================================================================
     v105 时间线字段显隐（按一级分类）
     规则来源：用户表格（1=显示 / 0=隐藏），字段 = 生产日期 / 退库日期 / 有效期 / 质保期
     （入库日期在所有分类均为显示，故不做控制）
     ⚠️ 只控制「前端是否展示」：字段值一律保留、隐藏项不参与必填校验、
        切换分类回来后已填内容仍在（不删数据、不清空输入框）。
     ================================================================== */
  const TIMELINE_RULES = {
    sys_digital:    { production:1, retire:1, expiry:0, warranty:1 },  // 数码产品
    sys_smarthome:  { production:1, retire:1, expiry:0, warranty:1 },  // 智能家居
    sys_clothing:   { production:1, retire:1, expiry:0, warranty:0 },  // 衣服鞋包
    sys_appliance:  { production:1, retire:1, expiry:0, warranty:1 },  // 家用电器
    sys_outdoor:    { production:1, retire:1, expiry:0, warranty:1 },  // 户外运动
    sys_transport:  { production:1, retire:1, expiry:0, warranty:1 },  // 交通出行
    sys_collection: { production:1, retire:1, expiry:0, warranty:0 },  // 收藏爱好
    sys_hardware:   { production:1, retire:1, expiry:1, warranty:1 },  // 家装五金
    sys_asset:      { production:1, retire:1, expiry:0, warranty:1 },  // 固定资产
    sys_service:    { production:0, retire:1, expiry:1, warranty:0 },  // 服务项目
    sys_virtual:    { production:0, retire:1, expiry:1, warranty:0 },  // 虚拟产品
    sys_other:      { production:1, retire:1, expiry:1, warranty:1 },  // 其他
    sys_home:       { production:1, retire:1, expiry:1, warranty:1 },  // 家居日用（v106：质保期显示）
    sys_consumable: { production:1, retire:1, expiry:1, warranty:1 },  // 耗品配件
    sys_beauty:     { production:1, retire:1, expiry:1, warranty:0 },  // 个护美妆
    sys_baby:       { production:1, retire:1, expiry:1, warranty:1 },  // 母婴儿童（v106：质保期显示）
    sys_snack:      { production:1, retire:1, expiry:1, warranty:0 },  // 零食饮料
    sys_tea:        { production:1, retire:1, expiry:1, warranty:0 },  // 酒咖品茗
    sys_pet:        { production:1, retire:1, expiry:1, warranty:0 },  // 宠物用品
    sys_medical:    { production:1, retire:1, expiry:1, warranty:1 },  // 健康医疗（v106：质保期显示）
    sys_office:     { production:1, retire:1, expiry:1, warranty:0 }   // 办公学习
  };
  const TIMELINE_ALL_VISIBLE = { production:1, retire:1, expiry:1, warranty:1 };
  // 每个逻辑字段对应：单个物品表单行 / 批量物品表单行 / 编辑库存品·每批次档案行
  const TIMELINE_ROW_SELECTORS = {
    production: ['[data-target="#iProductionDate"]', '[data-target="#iBatchProductionDate"]', '#iEditBatchProductionRow'],
    retire:     ['[data-target="#iRetireDate"]',     '[data-target="#iBatchRetireDate"]',     '#iEditBatchRetiredRow'],
    expiry:     ['#iExpiryDateTrigger',              '#iBatchExpiryDateTrigger',              '#iEditBatchExpiryRow'],
    warranty:   ['[data-target="#iWarrantyDate"]',   '[data-target="#iBatchWarrantyDate"]',   '#iEditBatchWarrantyRow']
  };
  // 自定义分类 / 未分类 / 没有规则的分类 → 全部字段显示
  function timelineRuleFor(categoryId){
    const path=getCategoryPath(categoryId);
    return TIMELINE_RULES[path.primaryId] || TIMELINE_ALL_VISIBLE;
  }
  function timelineFieldVisible(categoryId, field){
    return !!timelineRuleFor(categoryId)[field];
  }
  // 按当前选中分类实时刷新时间线区域的显隐（隐藏仅作用于展示：输入框的值原样保留）
  function applyTimelineVisibility(categoryId){
    const kind=virtualKindFor(categoryId);   // v107：会员订阅 / 账号密码 → 时间线整块换成专用字段
    const rule=timelineRuleFor(categoryId);
    Object.keys(TIMELINE_ROW_SELECTORS).forEach(field=>{
      const show = kind ? false : !!rule[field];
      TIMELINE_ROW_SELECTORS[field].forEach(sel=>{
        const el=document.querySelector(sel);
        if(el) el.style.display=show?'':'none';
      });
    });
    // 入库日期：这两类不涉及「入库」，一并隐藏（普通分类照常显示）
    ['[data-target="#iPurchaseDate"]','[data-target="#iBatchPurchaseDate"]'].forEach(sel=>{
      const el=document.querySelector(sel);
      if(el) el.style.display=kind?'none':'';
    });
    const src=temp.editId?state.items.find(it=>it.id===temp.editId):null;
    renderVirtualTimeline(categoryId, src?{
      account:src.account||'', memberStart:src.memberStart||'',
      memberEnd:src.memberEnd||'', password:src.password||''
    }:null);
  }

  /* ==================================================================
     v107 虚拟产品-会员订阅 / 账号密码：时间线卡片换成专用字段
     ------------------------------------------------------------------
     · 会员订阅：账号 / 会员开始日期（选填）/ 会员结束日期
     · 账号密码：账号 / 密码
     · 数据存物品级：item.account / item.memberStart / item.memberEnd / item.password
     · 会员结束日期同时写入批次有效期 → 「今日 / 到期清单」照旧能提醒会员到期
     · 批次在内部仍保留（库存 / 取用 / 日均成本等计算依赖它），但这两类的界面
       不再展示批次号（不涉及批次）
     ================================================================== */
  const VIRTUAL_KIND_BY_SECONDARY = { '会员订阅':'member', '账号密码':'account' };
  const VIRTUAL_FIELDS = {
    member: [
      { key:'account',     label:'账号',                icon:'user',     type:'text', ph:'请输入账号' },
      { key:'memberStart', label:'会员开始日期（选填）',  icon:'calendar', type:'date' },
      { key:'memberEnd',   label:'会员结束日期',         icon:'calendar', type:'date' }
    ],
    account: [
      { key:'account',  label:'账号', icon:'user', type:'text', ph:'请输入账号' },
      { key:'password', label:'密码', icon:'lock', type:'text', ph:'请输入密码' }
    ]
  };
  const VIRTUAL_VALUE_KEYS = ['account','memberStart','memberEnd','password'];
  function virtualKindFor(categoryId){
    const path=getCategoryPath(categoryId);
    if(path.primaryId!=='sys_virtual') return null;
    return VIRTUAL_KIND_BY_SECONDARY[path.secondaryName||'']||null;
  }
  function virtualFieldId(prefix, key){ return prefix+key.charAt(0).toUpperCase()+key.slice(1); }
  function tlFieldIcon(kind){
    if(kind==='calendar') return '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>';
    if(kind==='lock') return '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>';
    return '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
  }
  // 时间线里的专用字段行（单个表单 prefix='i' / 批量表单 prefix='iBatch'）——沿用与日期行完全一致的样式
  function virtualRowsHtml(kind, prefix){
    return (VIRTUAL_FIELDS[kind]||[]).map(f=>{
      const id=virtualFieldId(prefix, f.key);
      if(f.type==='date'){
        return `<div class="i-date-row i-tl-vrow" id="iTlRow_${id}">
          <div class="i-label">${tlFieldIcon('calendar')}<span class="i-label-txt">${f.label}</span></div>
          <div class="i-value empty"><input type="date" id="${id}" readonly placeholder="请选择"></div>
        </div>`;
      }
      return `<div class="i-date-row i-tl-vrow i-tl-textrow">
        <div class="i-label">${tlFieldIcon(f.icon)}<span class="i-label-txt">${f.label}</span></div>
        <div class="i-value"><input type="text" class="i-tl-text" id="${id}" placeholder="${f.ph}" autocomplete="off"></div>
      </div>`;
    }).join('');
  }
  let tlVirtualKind={ single:null };
  function renderVirtualTimeline(categoryId, values){
    const kind=virtualKindFor(categoryId);
    const boxS=$('#iTlCustomSingle'), boxB=$('#iTlCustomBatch');
    if(!boxS && !boxB) return kind;
    const vals={};
    VIRTUAL_VALUE_KEYS.forEach(k=>{ if(values && values[k]) vals[k]=values[k]; });
    if(kind!==tlVirtualKind.single){
      // 重建前先收集界面已填内容（切换分类时不丢输入）
      const keep={};
      VIRTUAL_VALUE_KEYS.forEach(k=>{
        const el=document.getElementById(virtualFieldId('i',k));
        if(el && el.value) keep[k]=el.value;
      });
      tlVirtualKind.single=kind;
      if(boxS) boxS.innerHTML=kind?virtualRowsHtml(kind,'i'):'';
      if(boxB) boxB.innerHTML=kind?virtualRowsHtml(kind,'iBatch'):'';
      ['i','iBatch'].forEach(p=>{
        ['memberStart','memberEnd'].forEach(k=>{
          const id=virtualFieldId(p,k);
          const row=document.getElementById('iTlRow_'+id);
          const input=document.getElementById(id);
          if(row&&input) row.addEventListener('click',()=>openDatePicker('#'+id, input.value||todayStr()));
        });
      });
      Object.keys(keep).forEach(k=>{ vals[k]=keep[k]; });
    }
    VIRTUAL_VALUE_KEYS.forEach(k=>{
      if(!vals[k]) return;
      ['i','iBatch'].forEach(p=>{
        const el=document.getElementById(virtualFieldId(p,k));
        if(el && !el.value) el.value=vals[k];
      });
    });
    if(boxS) boxS.style.display=kind?'block':'none';
    if(boxB) boxB.style.display=kind?'block':'none';
    return kind;
  }
  // 当前表单里填的专用字段值（单个/批量各取一次）
  function readVirtualFormValues(isBatch){
    const p=isBatch?'iBatch':'i';
    const out={};
    VIRTUAL_VALUE_KEYS.forEach(k=>{
      const el=document.getElementById(virtualFieldId(p,k));
      out[k]=el?(el.value||'').trim():'';
    });
    return out;
  }

  // 物品档案页：这两类改为「会员信息 / 账号信息」区块，并隐藏「每批次档案」
  function renderDetailVirtualSection(item){
    const wrap=$('#iDetailVirtualSection');
    if(!wrap) return null;
    const sec=$('#iBatchArchiveSection');
    const firstDateRow=$('#iDetailFirstDateRow');
    const kind=virtualKindFor(item.categoryId);
    if(!kind){
      wrap.style.display='none'; wrap.innerHTML='';
      if(sec) sec.style.display='';
      if(firstDateRow) firstDateRow.style.display='';
      return null;
    }
    const rows=(VIRTUAL_FIELDS[kind]||[]).map(f=>{
      const v=item[f.key]||'';
      const show=f.type==='date' ? (v?formatDateDot(v):'--') : (v||'--');
      return `<div class="i-detail-row"><span class="i-detail-row-label">${escapeHtml(f.label)}</span><span class="i-detail-row-value">${escapeHtml(String(show))}</span></div>`;
    }).join('');
    wrap.innerHTML=`<h2 class="i-detail-section-title">${kind==='member'?'会员信息':'账号信息'}</h2><div class="i-detail-rows">${rows}</div>`;
    wrap.style.display='block';
    if(sec) sec.style.display='none';        // 不涉及批次 → 不展示每批次档案
    if(firstDateRow) firstDateRow.style.display='none';
    return kind;
  }

  // 编辑库存品页：这两类改为专用字段编辑区，并隐藏「每批次档案」卡片与「入库批次」行
  function renderEditVirtualFields(item){
    const wrap=$('#iEditVirtualCard');
    if(!wrap) return null;
    const title=$('#iEditBatchCardTitle'), card=$('#iEditBatchCard'), countRow=$('#iEditBatchCountRow');
    const kind=item?virtualKindFor(item.categoryId):null;
    const hideBatch=!!kind;
    if(title) title.style.display=hideBatch?'none':'';
    if(card) card.style.display=hideBatch?'none':'';
    if(countRow) countRow.style.display=hideBatch?'none':'';
    if(!kind){ wrap.style.display='none'; wrap.innerHTML=''; return null; }
    const rows=(VIRTUAL_FIELDS[kind]||[]).map(f=>{
      if(f.type==='date'){
        return `<div class="i-edit-info-row i-edit-row-click" id="iEditVr_${f.key}">
          <span class="i-edit-row-label">${f.label}</span>
          <span class="i-edit-row-value i-edit-readonly" id="iEditVt_${f.key}">请选择</span>
          <span class="i-bs-arrow">›</span>
          <input type="date" id="iEditV_${f.key}" hidden>
        </div>`;
      }
      return `<div class="i-edit-info-row i-edit-stack">
        <div class="i-edit-label-block"><div class="i-edit-row-label">${f.label}</div></div>
        <input type="text" class="i-edit-input i-edit-input-block" id="iEditV_${f.key}" placeholder="${f.ph}" autocomplete="off">
      </div>`;
    }).join('');
    wrap.innerHTML=`<div class="i-edit-section-title">${kind==='member'?'会员信息':'账号信息'}</div><div class="i-edit-card">${rows}</div>`;
    wrap.style.display='block';
    VIRTUAL_VALUE_KEYS.forEach(k=>{
      const el=document.getElementById('iEditV_'+k);
      if(el) el.value=item[k]||'';
      const t=document.getElementById('iEditVt_'+k);
      if(t) t.textContent=item[k]&&f_isDateKey(k)?formatDateDot(item[k]):(item[k]||'请选择');
    });
    ['memberStart','memberEnd'].forEach(k=>{
      const row=document.getElementById('iEditVr_'+k);
      const input=document.getElementById('iEditV_'+k);
      if(row&&input) row.addEventListener('click',()=>openDatePicker('#iEditV_'+k, input.value||todayStr()));
    });
    return kind;
  }
  function f_isDateKey(k){ return k==='memberStart'||k==='memberEnd'; }
  function readEditVirtualValues(){
    const out={};
    VIRTUAL_VALUE_KEYS.forEach(k=>{
      const el=document.getElementById('iEditV_'+k);
      out[k]=el?(el.value||'').trim():'';
    });
    return out;
  }

  /* ==================================================================
     v108 物品照片（拍照 / 从相册选择）
     ------------------------------------------------------------------
     · 原图：压到最长边 1600px 的 JPEG → 存本机 IndexedDB（不受 localStorage 5MB 限制）
     · 缩略图：最长边 260px 的 JPEG(dataURL) → 存 item.photos 里，随物品数据云端同步
       （手机拍的，电脑上也能看到小图；原图只在本机）
     · 每件最多 6 张；缩略图可直接「设为物品图标」
     ================================================================== */
  const PHOTO_MAX = 6;
  const PHOTO_FULL_MAX = 1600;
  const PHOTO_THUMB_MAX = 260;
  const PHOTO_DB = 'you_items_photos';
  const PHOTO_STORE = 'photos';
  const PHOTO_SLOTS = {
    single: { strip:'#iPhotoStrip',      cam:'#iPhotoCameraInput',      camBtn:'#iPhotoCameraBtn',      album:'#iPhotoAlbumInput',      albumBtn:'#iPhotoAlbumBtn' },
    batch:  { strip:'#iBatchPhotoStrip', cam:'#iBatchPhotoCameraInput', camBtn:'#iBatchPhotoCameraBtn', album:'#iBatchPhotoAlbumInput', albumBtn:'#iBatchPhotoAlbumBtn' },
    edit:   { strip:'#iEditPhotoStrip',  cam:'#iEditPhotoCameraInput',  camBtn:'#iEditPhotoCameraBtn',  album:'#iEditPhotoAlbumInput',  albumBtn:'#iEditPhotoAlbumBtn' }
  };
  const photoStaging = { single:[], batch:[], edit:[] };   // 各表单当前的照片（含缩略图）
  let detailPhotoItem = null;                              // 档案页正在看照片的物品
  let photoViewerCtx = null;                               // 看图弹窗上下文

  function photoUid(){ return 'ph_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,8); }
  function getItemPhotos(item){ return item&&Array.isArray(item.photos)?item.photos:[]; }
  function photosOfStaging(slot){ return Array.isArray(photoStaging[slot])?photoStaging[slot]:[]; }
  // 表单照片 → 物品里的精简结构（只留缩略图，原图在 IndexedDB）
  function photosForSave(slot){
    return photosOfStaging(slot).map(p=>({ id:p.id, thumb:p.thumb, w:p.w||0, h:p.h||0, createdAt:p.createdAt||Date.now() }));
  }

  /* ---- IndexedDB：原图存取 ---- */
  function photoDbOpen(){
    return new Promise((resolve,reject)=>{
      if(!('indexedDB' in window)){ reject(new Error('不支持 IndexedDB')); return; }
      const req=indexedDB.open(PHOTO_DB,1);
      req.onupgradeneeded=()=>{ const db=req.result; if(!db.objectStoreNames.contains(PHOTO_STORE)) db.createObjectStore(PHOTO_STORE,{ keyPath:'id' }); };
      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>reject(req.error);
    });
  }
  async function photoPut(id, blob){
    try{
      const db=await photoDbOpen();
      await new Promise((res,rej)=>{
        const tx=db.transaction(PHOTO_STORE,'readwrite');
        tx.objectStore(PHOTO_STORE).put({ id, blob, createdAt:Date.now() });
        tx.oncomplete=()=>res(); tx.onerror=()=>rej(tx.error);
      });
      db.close(); return true;
    }catch(e){ return false; }   // 隐私模式等：原图存不下也不影响缩略图
  }
  async function photoGet(id){
    try{
      const db=await photoDbOpen();
      const rec=await new Promise((res,rej)=>{
        const tx=db.transaction(PHOTO_STORE,'readonly');
        const rq=tx.objectStore(PHOTO_STORE).get(id);
        rq.onsuccess=()=>res(rq.result||null); rq.onerror=()=>rej(rq.error);
      });
      db.close();
      return rec?rec.blob:null;
    }catch(e){ return null; }
  }
  async function photoDel(id){
    try{
      const db=await photoDbOpen();
      await new Promise(res=>{ const tx=db.transaction(PHOTO_STORE,'readwrite'); tx.objectStore(PHOTO_STORE).delete(id); tx.oncomplete=()=>res(); tx.onerror=()=>res(); });
      db.close();
    }catch(e){}
  }

  /* ---- 压缩：原图 1600px/q0.82 + 缩略图 260px/q0.7 ----
     用 <img> + objectURL 解码（兼容性最好：安卓 Chrome / iOS Safari 都稳；
     浏览器会按 EXIF 自动摆正方向），再画到 canvas 输出 JPEG。 */
  function dataUrlToBlob(dataUrl){
    const parts=String(dataUrl||'').split(',');
    const mime=((parts[0]||'').match(/data:([^;]+)/)||[])[1]||'image/jpeg';
    const bin=atob(parts[1]||'');
    const arr=new Uint8Array(bin.length);
    for(let i=0;i<bin.length;i++) arr[i]=bin.charCodeAt(i);
    return new Blob([arr],{ type:mime });
  }
  function compressPhoto(file){
    return new Promise((resolve,reject)=>{
      const url=URL.createObjectURL(file);
      const img=new Image();
      img.onload=()=>{
        try{
          const sw=img.naturalWidth||img.width, sh=img.naturalHeight||img.height;
          if(!sw||!sh){ throw new Error('图片尺寸异常'); }
          const drawTo=(maxSide)=>{
            const scale=Math.min(1, maxSide/Math.max(sw,sh));
            const w=Math.max(1,Math.round(sw*scale)), h=Math.max(1,Math.round(sh*scale));
            const cv=document.createElement('canvas'); cv.width=w; cv.height=h;
            cv.getContext('2d').drawImage(img,0,0,w,h);
            return cv;
          };
          const cvFull=drawTo(PHOTO_FULL_MAX);
          const cvThumb=drawTo(PHOTO_THUMB_MAX);
          const thumb=cvThumb.toDataURL('image/jpeg',0.7);
          cvFull.toBlob(b=>{
            if(!b){
              // 极少数浏览器 toBlob 失败 → 退回 dataURL 转 Blob
              try{ resolve({ fullBlob:dataUrlToBlob(cvFull.toDataURL('image/jpeg',0.82)), thumb, w:cvFull.width, h:cvFull.height }); }
              catch(e){ reject(new Error('压缩失败')); }
              return;
            }
            resolve({ fullBlob:b, thumb, w:cvFull.width, h:cvFull.height });
          },'image/jpeg',0.82);
        }catch(e){ reject(e); }
      };
      img.onerror=()=>{ reject(new Error('图片无法读取')); };
      img.onload=((orig)=>function(ev){ try{ orig.call(this,ev); }finally{ URL.revokeObjectURL(url); } })(img.onload);
      img.src=url;
    });
  }

  /* ---- 照片墙渲染 ---- */
  function renderPhotoStrip(slot){
    const cfg=PHOTO_SLOTS[slot]; if(!cfg) return;
    const box=document.querySelector(cfg.strip); if(!box) return;
    const list=photosOfStaging(slot);
    box.innerHTML = list.length
      ? list.map((p,i)=>`<div class="i-photo-item"><img src="${p.thumb}" alt="物品照片" onclick="__photoOpen('${slot}',${i})"><button type="button" class="i-photo-del" onclick="event.stopPropagation();__photoRemove('${slot}',${i})">×</button></div>`).join('')
      : '<div class="i-photo-empty">还没有照片</div>';
  }
  async function addPhotoFiles(slot, files){
    const list=photosOfStaging(slot);
    const remain=PHOTO_MAX-list.length;
    if(remain<=0){ showToast('最多 '+PHOTO_MAX+' 张照片'); return; }
    const arr=[...files].filter(f=>f && /^image\//.test(f.type||'')).slice(0,remain);
    if(!arr.length){ showToast('请选择图片文件'); return; }
    let ok=0;
    for(const f of arr){
      try{
        const r=await compressPhoto(f);
        const id=photoUid();
        list.push({ id, thumb:r.thumb, w:r.w, h:r.h, createdAt:Date.now() });
        renderPhotoStrip(slot);                          // 先把缩略图显示出来（不阻塞界面）
        photoPut(id, r.fullBlob);                        // 原图后台落 IndexedDB，失败也不影响缩略图
        ok++;
      }catch(e){ console.warn('照片处理失败', e); }
    }
    renderPhotoStrip(slot);
    showToast(ok?('已添加 '+ok+' 张照片'):'照片读取失败，换个格式再试');
  }
  window.__photoRemove=function(slot, i){
    const list=photosOfStaging(slot);
    const p=list[i];
    if(!p) return;
    list.splice(i,1);
    photoDel(p.id);                    // 原图一并删掉（未保存过的也不会留垃圾）
    renderPhotoStrip(slot);
    showToast('已删除照片');
  };
  window.__photoOpen=function(slot, i){
    const p=photosOfStaging(slot)[i];
    if(!p) return;
    photoViewerCtx={ kind:'staging', slot, index:i };
    openPhotoViewer(p.thumb);
  };
  window.__photoOpenItem=function(i){
    if(!detailPhotoItem) return;
    const p=getItemPhotos(detailPhotoItem)[i];
    if(!p) return;
    photoViewerCtx={ kind:'item', item:detailPhotoItem, index:i };
    openPhotoViewer(p.thumb);          // 先用缩略图立即打开（不等本机原图）
    photoGet(p.id).then(blob=>{        // 本机原图到位后再替换成大图
      if(!blob) return;
      const ctx=photoViewerCtx;
      if(!ctx || ctx.kind!=='item' || ctx.index!==i) return;
      const img=$('#iPhotoViewerImg');
      if(img) img.src=URL.createObjectURL(blob);
    });
  };
  function openPhotoViewer(src, fallback){
    const img=$('#iPhotoViewerImg');
    if(img){
      img.onerror=()=>{ if(fallback && img.src!==fallback) img.src=fallback; };
      img.src=src;
    }
    openModal('iPhotoModal');
  }

  /* ---- 档案页照片区 ---- */
  function renderDetailPhotos(item){
    const sec=$('#iDetailPhotoSection'), strip=$('#iDetailPhotoStrip');
    if(!sec||!strip) return;
    const list=getItemPhotos(item);
    detailPhotoItem=item;
    if(!list.length){ sec.style.display='none'; strip.innerHTML=''; return; }
    sec.style.display='block';
    strip.innerHTML=list.map((p,i)=>`<div class="i-photo-item"><img src="${p.thumb}" alt="物品照片" onclick="__photoOpenItem(${i})"></div>`).join('');
  }

  function bindPhotoEvents(){
    Object.keys(PHOTO_SLOTS).forEach(slot=>{
      const cfg=PHOTO_SLOTS[slot];
      const cam=$(cfg.cam), album=$(cfg.album);
      $(cfg.camBtn)?.addEventListener('click',()=>{ if(cam){ cam.value=''; cam.click(); } });
      $(cfg.albumBtn)?.addEventListener('click',()=>{ if(album){ album.value=''; album.click(); } });
      cam?.addEventListener('change',e=>{ addPhotoFiles(slot, e.target.files); e.target.value=''; });
      album?.addEventListener('change',e=>{ addPhotoFiles(slot, e.target.files); e.target.value=''; });
    });
    // 看图弹窗：设为图标 / 删除
    $('#iPhotoSetIconBtn')?.addEventListener('click',()=>{
      const ctx=photoViewerCtx;
      if(!ctx) return;
      if(ctx.kind==='staging'){
        const p=photosOfStaging(ctx.slot)[ctx.index];
        if(!p) return;
        temp.selectedIcon=p.thumb;
        if(ctx.slot==='edit') updateEditIconBtn(); else updateIconBtn();
      }else{
        const item=ctx.item;
        const p=getItemPhotos(item)[ctx.index];
        if(!p) return;
        item.icon=p.thumb;
        item.updatedAt=new Date().toISOString();
        save();
        const g=groupItems(state.items).groups.find(gg=>gg.items.includes(item));
        renderOverview();
        if(g) showDetail(g);
      }
      closeModal('iPhotoModal');
      showToast('已设为物品图标');
    });
    $('#iPhotoDeleteBtn')?.addEventListener('click',()=>{
      const ctx=photoViewerCtx;
      if(!ctx) return;
      if(ctx.kind==='staging'){
        window.__photoRemove(ctx.slot, ctx.index);
      }else{
        const item=ctx.item;
        const p=getItemPhotos(item)[ctx.index];
        if(!p) return;
        item.photos.splice(ctx.index,1);
        photoDel(p.id);
        item.updatedAt=new Date().toISOString();
        save();
        const g=groupItems(state.items).groups.find(gg=>gg.items.includes(item));
        renderOverview();
        if(g) showDetail(g);
        showToast('已删除照片');
      }
      closeModal('iPhotoModal');
    });
  }

  function openAddItem(tab='single', editItem=null, presetCategory=null){
    temp.formTab=tab;
    temp.editId=editItem?editItem.id:null;
    temp.selectedCategory=presetCategory||(editItem?editItem.categoryId:null);
    temp.selectedIcon=editItem?(editItem.icon||'📦'):'📦';

    // reset form
    $$('#i-subpage-add input, #i-subpage-add textarea').forEach(el=>el.value='');
    $$('#i-subpage-add .i-switch').forEach(el=>el.classList.remove('on'));
    // v108：照片暂存区（编辑已有物品时带出它的照片）
    photoStaging.single=[]; photoStaging.batch=[];
    if(editItem && getItemPhotos(editItem).length){ photoStaging[tab]=getItemPhotos(editItem).map(p=>({ ...p })); }
    renderPhotoStrip('single'); renderPhotoStrip('batch');
    $('#iFormTabSingle').classList.toggle('active', tab==='single');
    $('#iFormTabBatch').classList.toggle('active', tab==='batch');
    $('#iSingleFields').style.display=tab==='single'?'block':'none';
    $('#iBatchFields').style.display=tab==='batch'?'block':'none';

    $('#iProductionDate').value=todayStr();
    $('#iPurchaseDate').value=todayStr();
    $('#iWarrantyDate').value='';
    $('#iBatchWarrantyDate').value='';
    temp.expirySpec={};   // 重置有效期时长，避免上次选择残留导致改生产日期时误重算
    $('#iBatchProductionDate').value=todayStr();
    $('#iBatchPurchaseDate').value=todayStr();
    $('#iQty').value='1';
    $('#iBatchUnitPrice').value='';
    $('#iBatchTotalPrice').value='';
    // 物品单位（v88）：默认「件」；编辑时沿用物品已有单位
    setBatchUnit((editItem && editItem.unit)||DEFAULT_UNIT);

    if(editItem){
      // 物品级字段：编辑时保留并可修改（分类/图标已在外部设置）
      $('#iName').value=editItem.name;
      $('#iRetireDate').value=editItem.retireDate||'';
      $('#iWarrantyDate').value=editItem.warrantyDate||'';
      $('#iBatchWarrantyDate').value=editItem.warrantyDate||'';
      $('#iLocation').value=editItem.location||'';
      $('#iMemo').value=editItem.memo||'';
      $('#iBatchName').value=editItem.name;
      $('#iBatchLocation').value=editItem.location||'';
      $('#iBatchMemo').value=editItem.memo||'';
      if(editItem.autoTakeOne) $('#iAutoTakeOne').classList.add('on');
      // 批次相关字段（购买/生产日期、数量、单价、有效期）【不预填旧值】：
      // 编辑语义 = 追加一条新入库批次，避免覆盖历史批次。
    }else{
      /* 新增模式：无需额外预填（计算方式卡片已移除） */
    }
    updateCategoryTrigger();
    updateIconBtn();
    // v92：累计维护支出 —— 输入框只填「本次维护金额」，历史累计由系统累加
    resetMaintenanceInput(editItem);
    showSubpage('add');
  }

  /* ===== v92：累计维护支出（本次金额 → 累加到物品级累计值） =====
     判定：不跟随批次保存。批次承载「入库」语义（数量/单价/有效期/日均成本），
     维护支出是跨批次的支出流水，故存物品级 maintenanceTotal（累计值）+ maintenanceLog（流水，便于日后展示）。
     累计维护支出不参与平均每日成本计算。 */
  // 框内提示：文案 = 「<累计维护数值>，本次填写的金额将累加保存」（无维护记录时为 0；不出现任何说明文字）
  function maintPhText(item){
    const total=Number((item && item.maintenanceTotal)||0);
    const val=total>0?(Math.round(total*100)/100).toString():'0';
    return val+'，本次填写的金额将累加保存';
  }
  function syncMaintPh(input, ph){
    if(!input || !ph) return;
    const show=(document.activeElement!==input) && !input.value.trim();
    ph.style.display=show?'flex':'none';
  }
  function bindMaintenanceInput(input, ph){
    if(!input || input._bound) return;
    input._bound=true;
    input.setAttribute('placeholder','');
    const sync=()=>syncMaintPh(input, ph);
    input.addEventListener('focus', sync);
    input.addEventListener('blur', sync);
    input.addEventListener('input', sync);
    sync();
  }
  // 未填=不变更；非法=返回 NaN（由调用方提示「累计维护支出中请输入金额」）；合法=累加并记流水
  function applyMaintenanceAmount(item, raw){
    const s=(raw||'').trim();
    if(s==='') return 0;
    const amt=Number(s);
    if(!isFinite(amt)) return NaN;
    item.maintenanceTotal=Math.round((Number(item.maintenanceTotal||0)+amt)*100)/100;
    if(!Array.isArray(item.maintenanceLog)) item.maintenanceLog=[];
    item.maintenanceLog.push({ date:todayStr(), amount:amt });
    return amt;
  }
  function resetMaintenanceInput(item){
    const el=$('#iMaintenance');
    if(el) el.value='';
    const ph=$('#iMaintenancePh');
    if(ph) ph.textContent=maintPhText(item);
    bindMaintenanceInput(el, ph);
  }
  // 编辑页（编辑库存品）的同类输入
  function resetEditMaintenanceInput(item){
    const el=$('#iEditMaintenance');
    if(el) el.value='';
    const ph=$('#iEditMaintenancePh');
    if(ph) ph.textContent=maintPhText(item);
    bindMaintenanceInput(el, ph);
  }

  function updateCategoryTrigger(){
    const cat=getCategory(temp.selectedCategory);
    // 未选择时显示占位文案；选择后显示「一级-二级」（只选一级时只显示一级名）——单个/批量两处同步
    let html='<span class="i-placeholder">请选择分类</span>';
    if(cat){
      const path=getCategoryPath(cat.id);
      html=escapeHtml(path.secondaryName ? `${path.primaryName}-${path.secondaryName}` : path.primaryName);
    }
    const single=$('#iCategoryTrigger .i-value');
    const batch=$('#iBatchCategoryTrigger .i-value');
    if(single) single.innerHTML=html;
    if(batch) batch.innerHTML=html;
    applyTimelineVisibility(temp.selectedCategory);   // v105：分类变化 → 实时刷新时间线字段显隐
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
    // v92：本次维护金额（选填）—— 非数字则提示「累计维护支出中请输入金额」（先校验，避免中途改坏已有数据）
    const maintRaw=($('#iMaintenance')?$('#iMaintenance').value:'').trim();
    if(maintRaw!=='' && !isFinite(Number(maintRaw))){ showToast('累计维护支出中请输入金额'); return; }

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
    // 质保期（选填）：单个/批量各自维护；物品级存一份用于编辑回显，同时写入本次批次
    item.warrantyDate=isBatch?($('#iBatchWarrantyDate')?.value||''):($('#iWarrantyDate')?.value||'');
    item.updatedAt=new Date().toISOString();

    const isEdit=!!temp.editId;
    // 新批次模型：构造本次入库批次
    let qty=1, price=0, totalPrice=0, expiryDate='', note=item.memo||'';
    // 物品单位（v88）：批量表单可下拉选择；单个表单沿用物品原有单位（默认「件」）
    const unit=isBatch?(($('#iBatchUnit')||{}).value||'件'):(item.unit||'件');
    item.unit=unit;
    const tRule=timelineRuleFor(temp.selectedCategory);   // v105：被分类隐藏的字段不校验必填（值原样保存，不丢数据）
    // v107：会员订阅 / 账号密码 —— 时间线专用字段（物品级存储）
    const vKind=virtualKindFor(temp.selectedCategory);
    if(vKind){
      const vv=readVirtualFormValues(isBatch);
      item.account=vv.account;
      if(vKind==='member'){
        if(!vv.memberEnd){ showToast('请填写会员结束日期'); return; }
        item.memberStart=vv.memberStart;
        item.memberEnd=vv.memberEnd;
      }else{
        item.password=vv.password;
      }
    }
    if(isBatch){
      qty=Math.max(0, parseInt($('#iQty').value)||0);
      if(qty<=0){ showToast('请输入入库数量'); return; }   // 编辑/批量均需有效数量
      // 物品单价未手动填写、但填了物品总价时：单价 = 总价/数量（自动算出并保存，v80）
      const unitPriceStr=$('#iBatchUnitPrice').value.trim();
      const totalPriceStr=$('#iBatchTotalPrice').value.trim();
      if(!unitPriceStr && totalPriceStr && qty>0){
        price=Math.round((Number(totalPriceStr)/qty)*100)/100;
        $('#iBatchUnitPrice').value=price.toFixed(2);   // 回显，保证保存值可见
      }else{
        price=Number(unitPriceStr)||0;
      }
      totalPrice=Number(totalPriceStr)||(qty*price);
      expiryDate=$('#iBatchExpiryDate').value;
      if(!vKind && tRule.expiry && !expiryDate){ showToast('请填写有效期'); return; }   // v107：专用字段分类不校验有效期
    }else{
      qty=1;
      price=Number($('#iPrice').value)||0;
      totalPrice=price;
      expiryDate=$('#iExpiryDate').value;
      if(!vKind && tRule.expiry && !expiryDate){ showToast('请填写有效期'); return; }   // v107：专用字段分类不校验有效期
    }

    // v107：会员订阅 → 用「会员结束日期」作为有效期，保证今日/到期清单仍能提醒会员到期
    if(vKind==='member') expiryDate=item.memberEnd||'';

    const batchId=dateToBatchId(item.purchaseDate);
    const newBatch={
      id: batchId,
      date: item.purchaseDate,
      quantity: qty,
      unit: unit,                                    // v88 物品单位（件/ml/g/瓶…）
      unitPrice: price,
      totalPrice: totalPrice,
      validity: { value:365, unit:'day' },
      expiryDate: expiryDate,
      productionDate: item.productionDate||'',
      retiredDate: isBatch ? '' : (item.retiredDate||''),
      warrantyDate: item.warrantyDate||'',
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
    item.photos=photosForSave(isBatch?'batch':'single');   // v108：照片（缩略图随物品数据同步，原图在本机）
    // v92：累计维护支出 = 历史累计 + 本次填写金额（物品级累加；不参与平均每日成本计算）
    if(maintRaw!=='') applyMaintenanceAmount(item, maintRaw);
    save();
    photoStaging.single=[]; photoStaging.batch=[];        // v108：保存后清空照片暂存
    showToast(temp.editId?'已保存':'已添加');
    showSubpage('overview');
  }

  /* ===== 详情页 ===== */
  let currentDetailGroup=null;
  let currentDetailItem=null;
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
    // 单个物品判定：单批次且总入库量 ≤1（「批量」角标、「入库」按钮、「累计维护支出」共用同一判定）
    const isSingleItem=getItemBatches(item).length<=1 && totalIn<=1;
    // "批量"角标：多个批次或总入库量 > 1 才显示
    $('#iDetailBatch').textContent='批量';
    $('#iDetailBatch').classList.toggle('i-hide', isSingleItem);
    // 底部「入库」按钮：与「批量」角标同条件 —— 单个物品隐藏，批量物品显示
    $('#iDetailRestockBtn').classList.toggle('i-hide', isSingleItem);
    const starBtn=$('#iDetailStar');
    starBtn.classList.toggle('active', !!g.starred);
    // 收藏功能暂未启用：点击仅做居中提示
    starBtn.onclick=()=>{ showCenterToast('收藏功能暂未启用'); };
    $('#iDetailHeroName').textContent=g.name;
    $('#iDetailHeroDaily').textContent=g.dailyCost.toFixed(2);

    $('#iDetailUsed').textContent=totalUsed;

    // 已入库天数（卡片展示，已移除「已使用」字段与进度条）
    $('#iDetailDays').textContent=g.holdingDays;

    // 库存档案明细
    $('#iDetailAvgPrice').textContent=formatMoney(g.avgPrice);
    $('#iDetailTotalPrice').textContent=formatMoney(g.totalPrice);
    $('#iDetailTotalQty').textContent=totalIn+' 件';
    $('#iDetailInUse').textContent=totalUsed+' 件';
    // 当前状态：按「正在使用」数量判定 —— 0 件=待使用，≥1 件=现役中
    $('#iDetailStatus').textContent=totalUsed<=0?'待使用':'现役中';
    // 「首次入库时间」= 最早入库批次的日期（第一次填写的入库日期），纯展示，不再点击选批次
    const firstBatchDate=getItemBatches(item).map(b=>b.date).filter(Boolean).sort()[0];
    $('#iDetailFirstDate').textContent=firstBatchDate?formatDateDot(firstBatchDate):'--';
    $('#iDetailCategory').textContent=path.secondaryName?`${path.primaryName} > ${path.secondaryName}`:path.primaryName;
    $('#iDetailLocation').textContent=item.location||'-';
    $('#iDetailUpdated').textContent=formatIsoDot(item.updatedAt);
    // v92/v95：累计维护支出（汇总该物品/该组各物品的累计金额；不参与平均每日成本计算）
    // v95：仅「单个物品」的档案页显示，批量物品不显示（与「批量」角标、「入库」按钮同一判定）
    const maintTotal=Number(g.maintenanceTotal||0);
    $('#iDetailMaintenance').textContent=formatMoney(maintTotal);
    $('#iDetailMaintenanceRow')?.classList.toggle('i-hide', !isSingleItem);
    // 每批次档案：批量物品默认全部为空（需先选择批次）；单件物品自动选中唯一批次并带出数据
    currentDetailItem=item;
    const baBatches=getItemBatches(item);
    const baIsSingle = baBatches.length<=1 && totalIn<=1;
    if(baIsSingle && baBatches[0]){
      const b=baBatches[0];
      $('#iDetailBatchSel').textContent=b.id;
      $('#iDetailBatchSel').dataset.bid=b.id;
      $('#iDetailAddTime').textContent=formatDateDot(b.date);
      $('#iDetailInDate').textContent=formatDateDot(b.date);
      $('#iDetailProdDate').textContent=b.productionDate?formatDateDot(b.productionDate):(item.productionDate?formatDateDot(item.productionDate):'--');
      $('#iDetailExpiry').textContent=b.expiryDate?formatDateDot(b.expiryDate):'--';
      $('#iDetailBatchRetired').textContent=b.retiredDate?formatDateDot(b.retiredDate):'--';
      $('#iDetailBatchWarranty').textContent=b.warrantyDate?formatDateDot(b.warrantyDate):'--';
      $('#iDetailBatchQty').textContent=(Number(b.quantity)||0)+' 件';
      setBatchNoteText(b.note);   // v91：带出该批次的备注说明
      setBatchDelBtn(true);   // 批次已选中且数据已加载 → 按钮可用
    }else{
      $('#iDetailBatchSel').textContent='请选择批次';
      $('#iDetailBatchSel').dataset.bid='';
      $('#iDetailAddTime').textContent='--';
      $('#iDetailInDate').textContent='--';
      $('#iDetailProdDate').textContent='--';
      $('#iDetailExpiry').textContent='--';
      $('#iDetailBatchRetired').textContent='--';
      $('#iDetailBatchWarranty').textContent='--';
      $('#iDetailBatchQty').textContent='--';
      setBatchNoteText('');   // v91：未选批次 → 备注说明置空
      setBatchDelBtn(false);  // 未选择批次 → 按钮灰色不可点
    }
    bindBatchDateRow('#iDetailBatchSelRow', 'batch');
    renderDetailVirtualSection(item);   // v107：会员订阅/账号密码 → 档案页改显示会员信息/账号信息
    renderDetailPhotos(item);           // v108：档案页照片区

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

    const wasDetailOpen = isDetailOpen();
    showSubpage('detail');
    $('.main').scrollTop=0;
    // 进入详情时把这一层压入 history，使系统边缘滑动返回手势能「逐级」回退：
    // 详情(lvl2) → 列表(lvl1) → 主界面(lvl0)。桌面端不压栈，避免污染浏览器历史。
    const detailItemId = (g.items && g.items[0]) ? g.items[0].id : null;
    if(detailItemId && !wasDetailOpen && isMobileView()){
      const hs = history.state;
      const inHist = hs && hs.lvl===2 && hs.detailId===detailItemId;
      if(!inHist){
        history.pushState({ lvl:2, section:'items', sub:currentItemsSub, detailId:detailItemId }, '', '#/items/'+currentItemsSub+'/detail/'+detailItemId);
      }
    }
  }
  /* ===== 由 id 重新打开物品详情（供 app.js 的 popstate / 直达链接调用） ===== */
  function openDetailById(id, push){
    if(!id) return false;
    const groups = groupItems(state.items).groups;
    const g = groups.find(x => x.items && x.items[0] && x.items[0].id === id);
    if(!g) return false;
    showDetail(g);   // 内部已按「非详情进入时」自动压入 history（移动端）
    return true;
  }

  // 暴露给 app.js 的导航钩子（popstate 处理详情层级）
  window.ItemsNav = { openDetailById: openDetailById };

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
    // v80：「删除本批次数据」按钮（初始禁用，由 setBatchDelBtn 控制亮/灰）
    $('#iDetailBatchDelBtn')?.addEventListener('click', deleteDetailBatch);
    $('#iBatchDateConfirm')?.addEventListener('click',()=>{
      if(!batchDateSelectedId || !batchDateTargetRow) return;
      const all=[];
      currentDetailGroup.items.forEach(it=>getItemBatches(it).forEach(b=>all.push(b)));
      const b=all.find(x=>x.id===batchDateSelectedId);
      if(!b) return;
      // 每批次档案（v37）：选择批次后，第一行显示唯一标识符，其余字段带出该批次对应数据
      const owner=currentDetailGroup.items.find(it=>getItemBatches(it).some(x=>x.id===b.id)) || currentDetailItem;
      $('#iDetailBatchSel').textContent=b.id;
      $('#iDetailBatchSel').dataset.bid=b.id;
      $('#iDetailAddTime').textContent=formatDateDot(b.date);
      $('#iDetailInDate').textContent=formatDateDot(b.date);
      $('#iDetailProdDate').textContent=b.productionDate?formatDateDot(b.productionDate):((owner&&owner.productionDate)?formatDateDot(owner.productionDate):'--');
      $('#iDetailExpiry').textContent=b.expiryDate?formatDateDot(b.expiryDate):'--';
      $('#iDetailBatchRetired').textContent=b.retiredDate?formatDateDot(b.retiredDate):'--';
      $('#iDetailBatchWarranty').textContent=b.warrantyDate?formatDateDot(b.warrantyDate):'--';
      $('#iDetailBatchQty').textContent=(Number(b.quantity)||0)+' 件';
      setBatchNoteText(b.note);   // v91：带出所选批次的备注说明
      setBatchDelBtn(true);   // 批次已选中且数据已加载 → 「删除本批次数据」按钮变亮
      closeModal('iBatchDateModal'); hideTabbar(false);
    });
  }
  // ===== v80：每批次档案「入库数量」行 + 「删除本批次数据」按钮 =====
  // v91：每批次档案「备注说明」行 —— 显示所选批次的备注内容（无备注显示 --）
  function setBatchNoteText(note){
    const el=$('#iDetailBatchNote');
    if(!el) return;
    const t=(note||'').toString().trim();
    el.textContent=t||'--';
  }
  // 按钮状态：未选择批次=灰色不可点；选中批次且数据加载后=可点
  function setBatchDelBtn(enabled){
    const btn=$('#iDetailBatchDelBtn');
    if(!btn) return;
    btn.disabled=!enabled;
    btn.classList.toggle('i-batch-del-on', !!enabled);
  }
  function deleteDetailBatch(){
    const btn=$('#iDetailBatchDelBtn');
    if(btn && btn.disabled) return;
    const batchId=($('#iDetailBatchSel').dataset.bid)||'';
    if(!batchId || !currentDetailGroup){ showToast('请先选择批次'); return; }
    // 定位该批次所属的物品（同一分组可能含多条物品记录）
    const owner=currentDetailGroup.items.find(it=>getItemBatches(it).some(b=>b.id===batchId));
    if(!owner){ showToast('批次数据已更新，请返回后重新进入'); return; }
    const isLastBatch=getItemBatches(owner).length<=1;
    const msg=isLastBatch
      ? `「${owner.name}」仅剩这一个批次，删除后整个物品都将被移除（含其全部取用记录），确定删除？`
      : `确定删除「${owner.name}」的批次 ${batchId} 吗？\n该批次的取用记录会一并删除，其他批次不受影响。`;
    if(!confirm(msg)) return;
    // 删除该批次 + 其取用记录（保证 总入库-已取用 口径一致）
    owner.batches=getItemBatches(owner).filter(b=>b.id!==batchId);
    owner.usings=getItemUsings(owner).filter(u=>u.batchId!==batchId);
    if(!owner.batches.length){
      // 批次清空 → 整物品移除，并写入墓碑，防止云端同步复活
      if(owner.id && !TOMB.includes(owner.id)) TOMB.push(owner.id);
      state.items=state.items.filter(it=>it.id!==owner.id);
    }else{
      owner.updatedAt=new Date().toISOString();
      // 重算兼容字段（单价/总价/库存）
      const totalQty=getItemTotalIn(owner);
      owner.qty=totalQty;
      owner.stockQty=Math.max(0,totalQty-getItemTotalUsed(owner));
      owner.totalPrice=owner.batches.reduce((s,b)=>s+(Number(b.totalPrice)||0),0);
    }
    save();
    showToast(isLastBatch?'已删除该物品':'已删除该批次');
    // 刷新：分组仍在则重进详情（批次选择重置），组已空则回总览
    const { groups }=groupItems(state.items);
    const g=groups.find(gg=>gg.key===currentDetailGroup.key);
    if(g) showDetail(g);
    else { showSubpage('overview'); }
    renderOverview();
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
      modal.addEventListener('click',e=>{ if(e.target===modal || e.target.closest('[data-close-modal]')) closeModal('iShareModal'); });
    }
    openModal('iShareModal');
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
        openCatItemsModal(card.dataset.id);   // v105：点击分类 → 弹窗展示该分类下的物品（不再直接跳添加页）
      });
    });
  }

  /* ==================================================================
     v105：分类卡片 → 弹窗展示该分类下的物品 + 「用此分类添加物品」
     ================================================================== */
  let catItemsTargetId=null;
  let catItemsGroups=[];
  function catItemsOf(catId){
    const cat=getCategory(catId);
    if(!cat) return [];
    const { groups }=groupItems(state.items);
    const isPrimary=!cat.parentId;
    return groups.filter(g=>isPrimary ? g.primaryId===catId : g.secondaryId===catId)
      .sort((a,b)=>{
        const p=(b.pinned?1:0)-(a.pinned?1:0);
        return p || String(a.name).localeCompare(String(b.name));
      });
  }
  function renderCatItemsList(){
    const list=$('#iCatItemsList');
    if(!list) return;
    const groups=catItemsOf(catItemsTargetId);
    const sub=$('#iCatItemsSub');
    if(sub) sub.textContent=groups.length?('共 '+groups.length+' 件物品，点一行看档案'):'这个分类下还没有物品';
    if(!groups.length){
      list.innerHTML='<div class="i-shop-empty">还没有物品 —— 点右下角「用此分类添加物品」就能加进来</div>';
      return;
    }
    list.innerHTML=groups.map((g,i)=>{
      const unit=groupUnit(g);
      const stock=g.qty<=1 && g.totalUsed>0 ? '正在使用' : ('库存 '+g.currentStock+unit);
      const meta=[groupLocation(g), stock].filter(Boolean).join(' · ');
      return `
      <div class="i-cat-item-row" onclick="__catItemOpen(${i})">
        <div class="i-cat-item-icon">${renderIcon(g.icon, g.name)}${todayBatchBadge(g)}</div>
        <div class="i-cat-item-main">
          <div class="i-cat-item-name">${escapeHtml(g.name)}</div>
          <div class="i-cat-item-meta">${escapeHtml(meta)}</div>
        </div>
        <span class="i-bs-arrow">›</span>
      </div>`;
    }).join('');
    catItemsGroups=groups;
  }
  window.__catItemOpen=function(i){
    const g=catItemsGroups[i];
    if(!g) return;
    closeModal('iCatItemsModal');
    showDetail(g);
  };
  function openCatItemsModal(catId){
    const cat=getCategory(catId);
    if(!cat) return;
    catItemsTargetId=catId;
    const title=$('#iCatItemsTitle');
    if(title){
      const path=getCategoryPath(catId);
      title.textContent=path.secondaryName ? `${path.primaryName}-${path.secondaryName}` : path.primaryName;
    }
    renderCatItemsList();
    openModal('iCatItemsModal');
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
    const entries=getExpiringBatchEntries();
    let soon=0, expired=0, batchCount=0;
    entries.forEach(e=>{
      batchCount+=e.hits.length;
      if(e.hits.some(h=>h.expired)) expired++; else soon++;
    });
    const sum=$('#iExpiringSummary');
    if(sum) sum.textContent=`${soon} 件即将到期 / ${expired} 件已过期（共 ${batchCount} 个批次）`;
    const list=$('#iExpiringList');
    if(!list) return;
    if(entries.length===0){
      list.innerHTML=`<div class="i-empty"><p>暂无到期物品</p></div>`;
      return;
    }
    // 缓存本次渲染的数据，卡片内联 onclick 按下标取用
    expiringEntries=entries;
    list.innerHTML=entries.map((e,i)=>expiringCardHtml(e,i)).join('');
  }

  /* ==================================================================
     v99 今日（Today）页
     --------------------------------------------------------------
     判定口径：
       ① 到期：取该物品「未退库批次」中最早的有效期（批次没有则用物品级有效期），
          与今天比较，剩余天数 ≤ 30 天 → 进入「今天要处理」（已过期 delta<0，排最前）
       ② 补货：当前库存 ≤ 该分类的补货线（见下方 RESTOCK_LINE_* 配置）→ 标「低于补货线」
     配色：≤5 天（含已过期/今天/明天）红字；6~20 天黄字；21~30 天蓝字
     ================================================================== */

  /* ---- 补货线配置 ----
     语义：当前库存 ≤ 补货线 → 提示「低于补货线」。
     未列出的分类默认「不做补货提醒」（耐用/大件/服务/虚拟类不需要囤货）。 */
  const RESTOCK_LINE_PRIMARY = {   // 一级分类默认补货线
    sys_home: 2,        // 家居日用
    sys_consumable: 2,  // 耗品配件
    sys_beauty: 2,      // 个护美妆
    sys_baby: 3,        // 母婴儿童
    sys_snack: 3,       // 零食饮料
    sys_tea: 2,         // 酒咖品茗
    sys_pet: 2,         // 宠物用品
    sys_medical: 2,     // 健康医疗
    sys_office: 1       // 办公学习
  };
  const RESTOCK_LINE_SECONDARY = { // 二级分类覆盖值（键 = 一级id:二级名）
    // 家居日用
    'sys_home:纸抽':3, 'sys_home:手帕纸':3, 'sys_home:厨房湿巾':3, 'sys_home:湿厕纸':3, 'sys_home:洗脸巾':3,
    'sys_home:厨房用纸':2, 'sys_home:洗洁精':2, 'sys_home:洗衣用品':2, 'sys_home:清洁用品':2, 'sys_home:洗碗擦':2,
    'sys_home:洗碗盐':2, 'sys_home:香皂肥皂':2, 'sys_home:手套':2, 'sys_home:净水机滤芯':2, 'sys_home:滤网套':2,
    'sys_home:消毒液':1, 'sys_home:软水盐':1, 'sys_home:清洁膏':1, 'sys_home:油污净':1,
    // 耗品配件
    'sys_consumable:集尘袋':3, 'sys_consumable:滤网':2, 'sys_consumable:滤芯':2, 'sys_consumable:滚刷':2,
    'sys_consumable:边刷':2, 'sys_consumable:拖布':2, 'sys_consumable:地板清洁液':2, 'sys_consumable:玻璃水':2,
    'sys_consumable:车载香薰':1, 'sys_consumable:吸尘器替换头':1, 'sys_consumable:吸尘器延长杆':1, 'sys_consumable:毛发切割器':1,
    // 个护美妆
    'sys_beauty:面膜':3, 'sys_beauty:女性护理':3, 'sys_beauty:口腔护理':2, 'sys_beauty:洗发护发':2,
    'sys_beauty:身体护理':2, 'sys_beauty:防晒':2, 'sys_beauty:洁面':2, 'sys_beauty:爽肤水':2, 'sys_beauty:卸妆油':2,
    // 母婴儿童
    'sys_baby:纸尿裤':3, 'sys_baby:奶粉':3, 'sys_baby:婴儿湿巾':3, 'sys_baby:纸巾湿巾':3, 'sys_baby:辅食':2,
    // 零食饮料 / 酒咖品茗
    'sys_snack:乳制品':3, 'sys_snack:饮料':3, 'sys_snack:干果':2, 'sys_snack:面包零食':2,
    'sys_tea:茶叶':2, 'sys_tea:咖啡':2, 'sys_tea:酒水':1,
    // 宠物用品
    'sys_pet:猫砂':3, 'sys_pet:宠物粮':3, 'sys_pet:垃圾袋':2, 'sys_pet:冻干':2, 'sys_pet:宠物零食':2,
    'sys_pet:罐头':2, 'sys_pet:驱虫用品':1, 'sys_pet:消毒除臭':1, 'sys_pet:洗护用品':1, 'sys_pet:补剂药品':1
  };
  function restockLineOf(g){
    const key=(g.primaryId||'')+':'+(g.secondaryName||'');
    if(RESTOCK_LINE_SECONDARY[key]!=null) return RESTOCK_LINE_SECONDARY[key];
    const line=RESTOCK_LINE_PRIMARY[g.primaryId];
    return (line==null)?null:line;
  }
  function restockLineOfCategory(primaryId, secondaryName){
    const key=(primaryId||'')+':'+(secondaryName||'');
    if(RESTOCK_LINE_SECONDARY[key]!=null) return RESTOCK_LINE_SECONDARY[key];
    const line=RESTOCK_LINE_PRIMARY[primaryId];
    return (line==null)?null:line;
  }
  function groupUnit(g){ const it=g&&g.items&&g.items[0]; return (it&&it.unit)||'件'; }
  function groupLocation(g){ const it=g&&g.items&&g.items[0]; return (it&&it.location)||''; }

  /* ---- 该组「未退库批次」中最早到期的剩余天数（无有效期 → null） ---- */
  function groupExpiryDelta(g){
    const today=todayStr();
    let min=null;
    (g.items||[]).forEach(item=>{
      const actives=getActiveBatches(item);
      if(actives.length){
        actives.forEach(b=>{
          const exp=b.expiryDate||item.expiryDate;
          if(!exp) return;
          const d=daysDiff(today, exp);
          if(min===null||d<min) min=d;
        });
      }else if(item.expiryDate){
        const d=daysDiff(today, item.expiryDate);
        if(min===null||d<min) min=d;
      }
    });
    return min;
  }

  const TODAY_WINDOW=30;   // 从今天起算的到期窗口（天）

  function todayEntries(){
    const { groups }=groupItems(state.items);
    const out=[];
    groups.forEach(g=>{
      if(!g.items||!g.items.length) return;
      const delta=groupExpiryDelta(g);
      const line=restockLineOf(g);
      const lowStock=line!=null && g.currentStock<=line;
      const expiring=delta!==null && delta<=TODAY_WINDOW;
      if(!expiring && !lowStock) return;
      out.push({ g, delta, line, lowStock, expiring });
    });
    // 排序：已过期（越久越前）→ 今天/明天 → 剩余天数升序 → 仅低于补货线（库存越少越前）
    out.sort((a,b)=>{
      const ka=a.expiring?a.delta:9000+a.g.currentStock;
      const kb=b.expiring?b.delta:9000+b.g.currentStock;
      if(ka!==kb) return ka-kb;
      return String(a.g.name).localeCompare(String(b.g.name));
    });
    return out;
  }

  function expiryStatusText(delta){
    if(delta<0) return '已过期 '+Math.abs(delta)+' 天';
    if(delta===0) return '今天到期';
    if(delta===1) return '明天到期';
    return '距离到期还有 '+delta+' 天';
  }
  function expiryStatusCls(delta){
    if(delta<=5) return 'i-td-red';      // 含已过期 / 今天 / 明天
    if(delta<=20) return 'i-td-amber';
    return 'i-td-blue';
  }

  /* ---- 补货清单（本地存储 wb_items_shopping_v2，不参与云端同步） ---- */
  const SHOP_KEY='wb_items_shopping_v2';
  function shopList(){
    try{ const a=JSON.parse(localStorage.getItem(SHOP_KEY)||'[]'); return Array.isArray(a)?a:[]; }
    catch(e){ return []; }
  }
  function shopSave(arr){
    try{ localStorage.setItem(SHOP_KEY, JSON.stringify(arr)); }catch(e){}
    updateTodayShopUI();
  }
  function shopHas(g){ return shopList().some(x=>x.key===g.key); }
  function shopAdd(g){
    const list=shopList();
    if(list.some(x=>x.key===g.key)){ showToast('已在补货清单中'); return false; }
    list.push({
      key:g.key, name:g.name, icon:g.icon||'📦', unit:groupUnit(g), stock:g.currentStock,
      category:[g.primaryName, g.secondaryName].filter(Boolean).join('-'),
      addedAt:todayStr(), updatedAt:new Date().toISOString()
    });
    shopSave(list);
    showToast('已加入补货清单');
    return true;
  }
  function shopRemove(key){ shopSave(shopList().filter(x=>x.key!==key)); }

  function updateTodayShopUI(){
    const n=shopList().length;
    const row=$('#iTodayShopRow');
    const cnt=$('#iTodayShopPillCount');
    if(cnt) cnt.textContent=String(n);
    if(row) row.style.display=n?'flex':'none';
  }
  function renderShopModal(){
    const list=shopList();
    const el=$('#iShopList');
    if(!el) return;
    if(!list.length){
      el.innerHTML='<div class="i-shop-empty">清单还是空的 —— 在「今日」里点「加入清单」就会出现在这里</div>';
      return;
    }
    el.innerHTML=list.map((x,i)=>`
      <div class="i-shop-row">
        <div class="i-shop-icon">${renderIcon(x.icon, x.name)}</div>
        <div class="i-shop-main">
          <div class="i-shop-name">${escapeHtml(x.name)}</div>
          <div class="i-shop-meta">${escapeHtml([x.category, '现有 '+x.stock+(x.unit||'件')].filter(Boolean).join(' · '))}</div>
        </div>
        <button class="i-shop-done" onclick="__shopDone(${i})">已买</button>
      </div>`).join('');
  }
  window.__shopDone=function(i){
    const list=shopList();
    const it=list[i];
    if(!it) return;
    shopRemove(it.key);
    renderShopModal();
    renderTodayPage();
    showToast('已从清单划掉');
  };
  function openShopModal(){ renderShopModal(); openModal('iShopModal'); }

  /* ---- 今日页渲染 ---- */
  let todayRows=[];             // 渲染时缓存，卡片内联 onclick 按下标取用
  let todaySearchTerm='';

  function todayCardHtml(entry, idx){
    const g=entry.g, unit=groupUnit(g);
    const meta=[groupLocation(g)||g.primaryName||'未分类'];
    if(entry.lowStock) meta.push('仅剩 '+g.currentStock+unit);
    const status=[];
    if(entry.expiring) status.push(`<span class="i-td-st ${expiryStatusCls(entry.delta)}">${escapeHtml(expiryStatusText(entry.delta))}</span>`);
    if(entry.lowStock) status.push(`<span class="i-td-st ${g.currentStock<=0?'i-td-red':'i-td-amber'}">低于补货线</span>`);
    const inList=shopHas(g);
    let btn;
    if(entry.lowStock && !inList){
      btn=`<button class="i-td-btn i-td-btn-buy" onclick="event.stopPropagation();__todayAct(${idx},'buy')">加入清单</button>`;
    }else if(entry.lowStock && inList){
      btn=`<button class="i-td-btn i-td-btn-added" onclick="event.stopPropagation();__todayAct(${idx},'buy')">已在清单</button>`;
    }else if(entry.delta!==null && entry.delta<=20){
      btn=`<button class="i-td-btn i-td-btn-done" onclick="event.stopPropagation();__todayAct(${idx},'use')">用完了</button>`;
    }else{
      btn=`<button class="i-td-btn i-td-btn-view" onclick="event.stopPropagation();__todayAct(${idx},'view')">查看</button>`;
    }
    return `
    <div class="i-td-card ${entry.lowStock?'low':''}" data-key="${escapeHtml(g.key)}" onclick="__todayAct(${idx},'view')">
      <div class="i-td-icon">${renderIcon(g.icon, g.name)}${todayBatchBadge(g)}</div>
      <div class="i-td-main">
        <div class="i-td-name">${escapeHtml(g.name)}</div>
        <div class="i-td-sub"><span class="i-td-meta">${escapeHtml(meta.join(' · '))}</span>${status.length?' · '+status.join(' · '):''}</div>
      </div>
      ${btn}
    </div>`;
  }

  /* ---- 搜索：模糊匹配「我的全部物品内容」 ---- */
  function groupSearchText(g){
    const parts=[g.name, g.primaryName, g.secondaryName, groupUnit(g)];
    (g.items||[]).forEach(it=>{
      parts.push(it.location||'', it.memo||'');
      getItemBatches(it).forEach(b=>parts.push(b.note||''));
      getItemUsings(it).forEach(u=>parts.push(u.note||''));
    });
    return parts.filter(Boolean).join(' ');
  }
  function todaySearchGroups(term){
    const { groups }=groupItems(state.items);
    return groups.filter(g=>fuzzyMatch(groupSearchText(g), term))
      .sort((a,b)=>{
        const p=(b.pinned?1:0)-(a.pinned?1:0);
        if(p) return p;
        return String(a.name).localeCompare(String(b.name));
      });
  }
  // v101：批量物品（总入库 > 1）在今日页也显示「批量」标签，与物品统计页的角标同一口径（g.qty>1）
  function todayBatchBadge(g){
    return (g && g.qty>1) ? '<span class="i-batch-badge i-td-badge">批量</span>' : '';
  }
  // v102/v103：搜索结果里的库存状态文案
  //   单个物品（非批量）已取用过 → 「正在使用」；其余（含批量物品）→ 「库存 N 单位」
  function todayStockText(g){
    const unit=groupUnit(g);
    if(g.qty<=1 && g.totalUsed>0) return '正在使用';
    return '库存 '+g.currentStock+unit;
  }
  function todaySearchCardHtml(g, idx){
    const cat=[g.primaryName, g.secondaryName].filter(Boolean).join('-');
    const meta=[cat, groupLocation(g)].filter(Boolean).join(' · ');
    return `
    <div class="i-td-card" data-key="${escapeHtml(g.key)}" onclick="__todayAct(${idx},'view')">
      <div class="i-td-icon">${renderIcon(g.icon, g.name)}${todayBatchBadge(g)}</div>
      <div class="i-td-main">
        <div class="i-td-name">${escapeHtml(g.name)}</div>
        <div class="i-td-sub"><span class="i-td-meta">${escapeHtml(meta||'未分类')}</span> · <span class="i-td-stock">${escapeHtml(todayStockText(g))}</span></div>
      </div>
      <button class="i-td-btn i-td-btn-view" onclick="event.stopPropagation();__todayAct(${idx},'view')">查看</button>
    </div>`;
  }

  function renderTodayPage(){
    const d=new Date();
    const wd=['日','一','二','三','四','五','六'][d.getDay()];
    const dateEl=$('#iTodayDate');
    if(dateEl) dateEl.textContent=`${d.getMonth()+1}月${d.getDate()}日 星期${wd}`;

    const input=$('#iTodaySearch');
    if(input) input.value=todaySearchTerm;

    const list=$('#iTodayList');
    const titleEl=$('#iTodayBarTitle');
    const countEl=$('#iTodayCount');

    if(todaySearchTerm){
      const hits=todaySearchGroups(todaySearchTerm);
      todayRows=hits.map(g=>({ g, delta:groupExpiryDelta(g), expiring:false, lowStock:false, search:true }));
      if(titleEl) titleEl.textContent='搜索结果';
      if(countEl) countEl.textContent=hits.length+' 件';
      if(list) list.innerHTML=hits.length
        ? hits.map((g,i)=>todaySearchCardHtml(g,i)).join('')
        : `<div class="i-empty"><p>没找到和「${escapeHtml(todaySearchTerm)}」相关的物品</p></div>`;
      updateTodayShopUI();
      return;
    }

    const entries=todayEntries();
    todayRows=entries;
    if(titleEl) titleEl.textContent='今天要处理';
    if(countEl) countEl.textContent=entries.length+' 件';
    if(list) list.innerHTML=entries.length
      ? entries.map((e,i)=>todayCardHtml(e,i)).join('')
      : `<div class="i-empty"><p>今天没有要处理的事，安心用吧</p></div>`;
    updateTodayShopUI();
    updateTodayBadge();
  }

  /* ---- 「用完了」：按最早到期且有可用库存的批次记 1 次取用 ---- */
  function todayQuickUse(g){
    const today=todayStr();
    let bestBatch=null, bestItem=null, bestDelta=null;
    (g.items||[]).forEach(item=>{
      getActiveBatches(item).forEach(b=>{
        if(getBatchAvailableQty(item, b.id)<1) return;
        const exp=b.expiryDate||item.expiryDate;
        const d=exp?daysDiff(today, exp):99999;
        if(!bestBatch || bestDelta===null || d<bestDelta){ bestBatch=b; bestItem=item; bestDelta=d; }
      });
    });
    if(!bestBatch||!bestItem){ showToast('该物品没有可用库存'); return; }
    if(!Array.isArray(bestItem.usings)) bestItem.usings=[];
    bestItem.usings.push({ batchId:bestBatch.id, date:today, quantity:1, note:'' });
    bestItem.updatedAt=new Date().toISOString();
    save();
    showToast('已取用 1 '+(bestItem.unit||'件'));
    renderTodayPage();
    renderOverview();
    updateExpiringBadge();
  }

  window.__todayAct=function(i, act){
    const row=todayRows[i];
    if(!row){ showToast('列表已更新，请重试'); return; }
    const g=row.g;
    if(act==='use'){ todayQuickUse(g); return; }
    if(act==='buy'){
      if(shopHas(g)){ showToast('已在补货清单中'); return; }
      shopAdd(g);
      renderTodayPage();
      return;
    }
    showDetail(g);
  };

  function updateTodayBadge(){
    const el=$('#iNavTodayBadge');
    if(!el) return;
    const n=todayEntries().length;
    if(n>0){ el.textContent=n>99?'99+':String(n); el.style.display='inline-flex'; }
    else el.style.display='none';
  }

  /* ===== 批次档案页（到期清单点击入库批次进入） ===== */
  function showBatchArchive(item, b){
    if(!item || !b) return;
    // 单个物品 = 单批次且总入库 ≤ 1（与全站判定一致）
    const isSingle=getItemBatches(item).length<=1 && getItemTotalIn(item)<=1;
    const path=getCategoryPath(item.categoryId);
    const catText=path.secondaryName?`${path.primaryName} > ${path.secondaryName}`:path.primaryName;
    const prod=b.productionDate||item.productionDate||'';
    const rows=[
      ['分类', catText],
      ['添加时间', formatDateDot(b.date)],
      ['入库日期', formatDateDot(b.date)],
      ['生产日期', prod?formatDateDot(prod):'--'],
      ['有效期', b.expiryDate?formatDateDot(b.expiryDate):'--'],
      ['退库日期', b.retiredDate?formatDateDot(b.retiredDate):'--'],
      ['质保期', b.warrantyDate?formatDateDot(b.warrantyDate):'--']
    ];
    if(isSingle){
      rows.push(['购入价格', formatMoney(Number(b.unitPrice||item.price||0))]);
    }else{
      rows.push(['物品数量', String(Number(b.quantity||0))]);
      rows.push(['物品单价', formatMoney(Number(b.unitPrice||0))]);
      rows.push(['物品总价', formatMoney(Number(b.totalPrice||0))]);
    }
    const title=$('#iBatchArchiveTitle');
    if(title) title.textContent=`${item.name} · ${b.id}`;
    const body=$('#iBatchArchiveBody');
    if(!body) return;
    body.innerHTML=`
      <div class="i-detail-section">
        <h2 class="i-detail-section-title">每批次档案</h2>
        <div class="i-detail-rows">
          ${rows.map(r=>`<div class="i-detail-row"><span class="i-detail-row-label">${escapeHtml(r[0])}</span><span class="i-detail-row-value">${escapeHtml(String(r[1]))}</span></div>`).join('')}
        </div>
      </div>`;
    showSubpage('batch');
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
    temp.restockProdDate=temp.restockDate;
    temp.restockTotalManual=false;
    $('#iRestockSub').textContent=`为「${item.name}」新增一个入库批次`;
    $('#iRestockDate').textContent=formatDateDot(temp.restockDate);
    $('#iRestockDate').value=temp.restockDate;
    $('#iRestockProductionDate').textContent=formatDateDot(temp.restockProdDate);
    $('#iRestockProductionDate').value=temp.restockProdDate;
    $('#iRestockExpiry').textContent='请选择';
    $('#iRestockExpiry').value='';          // span 用 expando 存值，重开时必须清空，避免残留上次日期
    $('#iRestockRetiredDate').textContent='请选择';
    $('#iRestockRetiredDate').value='';
    temp.restockRetiredDate='';
    $('#iRestockWarrantyDate').textContent='请选择';
    $('#iRestockWarrantyDate').value='';
    temp.restockWarrantyDate='';
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
    $('#iRestockProductionDateRow')?.addEventListener('click',()=>{
      openDatePicker('#iRestockProductionDate', $('#iRestockProductionDate').value||temp.restockProdDate||todayStr());
    });
    $('#iRestockExpiryRow')?.addEventListener('click',()=>{
      if(!$('#iRestockProductionDate').value){ showToast('请先选择生产日期'); return; }
      openExpiryPicker('#iRestockExpiry', $('#iRestockProductionDate').value);
    });
    // 退库日期（选填）：点击弹出日期选择器，确定后由 confirmDatePicker 写入 temp.restockRetiredDate 并展示
    $('#iRestockRetiredDateRow')?.addEventListener('click',()=>{
      openDatePicker('#iRestockRetiredDate', temp.restockRetiredDate||todayStr());
    });
    // 质保期（选填）：与退库日期同款，确定后写入 temp.restockWarrantyDate 并展示
    $('#iRestockWarrantyDateRow')?.addEventListener('click',()=>{
      openDatePicker('#iRestockWarrantyDate', temp.restockWarrantyDate||todayStr());
    });
    // 总价 = 入库数量 × 单价，输入后自动计算；总价也可手动直接编辑
    const recalcRestockTotal=()=>{
      if(temp.restockTotalManual) return;
      const q=Number($('#iRestockQty').value)||0;
      const p=Number($('#iRestockUnitPrice').value)||0;
      $('#iRestockTotalPrice').value=(q>0&&p>0)?(Math.round(q*p*100)/100).toFixed(2):'';
    };
    $('#iRestockQty')?.addEventListener('input', recalcRestockTotal);
    $('#iRestockUnitPrice')?.addEventListener('input', recalcRestockTotal);
    $('#iRestockTotalPrice')?.addEventListener('input', ()=>{ temp.restockTotalManual=!!$('#iRestockTotalPrice').value; });
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
    // 单价未填而已填总价时：单价 = 总价/数量（与批量添加页一致，v80）
    const restockUnitStr=$('#iRestockUnitPrice').value.trim();
    const restockTotalStr=$('#iRestockTotalPrice').value.trim();
    let price;
    if(!restockUnitStr && restockTotalStr && qty>0){
      price=Math.round((Number(restockTotalStr)/qty)*100)/100;
      $('#iRestockUnitPrice').value=price.toFixed(2);
    }else{
      price=Number(restockUnitStr)||0;
    }
    const total=Number(restockTotalStr)||(qty*price);
    const date=temp.restockDate||todayStr();
    const item=restockTargetItem;
    if(!Array.isArray(item.batches)) item.batches=[];
    item.batches.push({
      id: dateToBatchId(date),
      date: date,
      quantity: Math.round(qty*10)/10,
      unit: item.unit||'件',                          // v88 沿用物品单位，保证批次数据结构一致
      unitPrice: price,
      totalPrice: total,
      validity: { value:365, unit:'day' },
      expiryDate: expiry,
      productionDate: temp.restockProdDate||'',
      retiredDate: temp.restockRetiredDate||'',
      warrantyDate: temp.restockWarrantyDate||'',
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
    temp.editVirtualMemberEnd='';   // v107：清理上一次编辑的会员结束日期，避免串值
    photoStaging.edit=getItemPhotos(item).map(p=>({ ...p }));   // v108：带出已有照片
    renderPhotoStrip('edit');
    temp.selectedCategory=item.categoryId;
    temp.selectedIcon=item.icon||'📦';
    $('#iEditName').value=item.name||'';
    updateEditCategoryUI();
    updateEditIconBtn();
    $('#iEditQty').textContent=getItemCurrentStock(item);
    const batches=getItemBatches(item);
    $('#iEditBatchCount').textContent=batches.length;
    $('#iEditLocation').value=item.location||'';
    if($('#iEditMemo')) $('#iEditMemo').value=item.memo||'';   // v91：备注说明（与物品维护页一致）
    resetEditMaintenanceInput(item);   // v92：累计维护支出（本次金额输入 + 历史累计提示）
    // 每批次档案：以每个批次为单位维护 单价 / 总价 / 退库日期
    temp.editBatchMap={};
    batches.forEach(b=>{
      temp.editBatchMap[b.id]={ unitPrice:Number(b.unitPrice||0), totalPrice:Number(b.totalPrice||0), retiredDate:b.retiredDate||'', warrantyDate:b.warrantyDate||'', expiryDate:b.expiryDate||'', productionDate:b.productionDate||'', expiryValue:(b.expiryValue!=null?b.expiryValue:''), expiryUnit:b.expiryUnit||'' };
    });
    const isSingle=batches.length<=1 && getItemTotalIn(item)<=1;
    if(isSingle && batches[0]){
      fillEditBatchArchive(batches[0].id);
    }else{
      temp.editBatchSel='';
      $('#iEditBatchArchiveSel').textContent='请选择批次';
      $('#iEditBatchUnitPrice').value='';
      $('#iEditBatchTotalPrice').value='';
      $('#iEditBatchRetiredDate').value='';
      $('#iEditBatchRetiredDateText').textContent='请选择';
      $('#iEditBatchWarrantyDate').value='';
      $('#iEditBatchWarrantyDateText').textContent='请选择';
      $('#iEditBatchExpiryDate').value='';
      $('#iEditBatchExpiryDateText').textContent='请选择';
      $('#iEditBatchProductionDate').value='';
      $('#iEditBatchProductionDateText').textContent='请选择';
    }
    hideTabbar(true);
    showSubpage('edit');
  }
  function fillEditBatchArchive(batchId){
    const m=temp.editBatchMap[batchId];
    if(!m) return;
    temp.editBatchSel=batchId;
    $('#iEditBatchArchiveSel').textContent=batchId;
    $('#iEditBatchUnitPrice').value=Number(m.unitPrice||0).toFixed(2);
    $('#iEditBatchTotalPrice').value=Number(m.totalPrice||0).toFixed(2);
    $('#iEditBatchRetiredDate').value=m.retiredDate||'';
    $('#iEditBatchRetiredDateText').textContent=m.retiredDate?formatDateDot(m.retiredDate):'请选择';
    $('#iEditBatchWarrantyDate').value=m.warrantyDate||'';
    $('#iEditBatchWarrantyDateText').textContent=m.warrantyDate?formatDateDot(m.warrantyDate):'请选择';
    $('#iEditBatchExpiryDate').value=m.expiryDate||'';
    $('#iEditBatchExpiryDateText').textContent=m.expiryDate?formatDateDot(m.expiryDate):'请选择';
    $('#iEditBatchProductionDate').value=m.productionDate||'';
    $('#iEditBatchProductionDateText').textContent=m.productionDate?formatDateDot(m.productionDate):'请选择';
  }
  function openEditBatchArchiveModal(){
    if(!editTargetItem) return;
    const item=editTargetItem;
    const batches=getItemBatches(item).slice().sort((a,b)=>(b.date||'').localeCompare(a.date||''));
    temp.editBatchPickId=temp.editBatchSel||'';
    // 批次清单只显示唯一标识符（如 20260904入库），不显示日期等附加信息
    $('#iEditRetiredBatchList').innerHTML=batches.map(b=>`
      <div class="i-bs-batch-item ${temp.editBatchPickId===b.id?'active':''}" data-id="${escapeHtml(b.id)}">
        <span class="i-bs-batch-name">${escapeHtml(b.id)}</span>
      </div>`).join('') || '<div class="i-empty"><p>暂无入库批次</p></div>';
    $$('#iEditRetiredBatchList .i-bs-batch-item').forEach(el=>{
      el.addEventListener('click',()=>{
        $$('#iEditRetiredBatchList .i-bs-batch-item').forEach(x=>x.classList.remove('active'));
        el.classList.add('active');
        temp.editBatchPickId=el.dataset.id;
      });
    });
    openModal('iEditRetiredBatchModal');
  }
  // 物品单价/物品总价已移至「每批次档案」卡片，按批次各自维护，故移除原自动联动逻辑

  function updateEditCategoryUI(){
    const cat=getCategory(temp.selectedCategory);
    const display=$('#iEditCategory');
    applyTimelineVisibility(temp.selectedCategory);   // v105：编辑页每批次档案字段显隐同步
    renderEditVirtualFields(editTargetItem);          // v107：会员订阅/账号密码 → 专用字段编辑区
    if(!cat){ display.innerHTML='<span class="i-placeholder">请选择分类</span>'; return; }
    const path=getCategoryPath(cat.id);
    // v96：分类名单行显示（不再显示「自定义」标签，避免挤压导致换行）
    display.textContent=path.secondaryName ? `${path.primaryName}-${path.secondaryName}` : path.primaryName;
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
    // 每批次档案：选择批次 → 弹出批次清单；单价/总价可编辑；退库日期点击选日期
    $('#iEditBatchArchiveSelRow')?.addEventListener('click',()=>openEditBatchArchiveModal());
    $('#iEditBatchUnitPrice')?.addEventListener('input',()=>{
      if(temp.editBatchSel && temp.editBatchMap[temp.editBatchSel]) temp.editBatchMap[temp.editBatchSel].unitPrice=Number($('#iEditBatchUnitPrice').value)||0;
    });
    $('#iEditBatchTotalPrice')?.addEventListener('input',()=>{
      if(temp.editBatchSel && temp.editBatchMap[temp.editBatchSel]) temp.editBatchMap[temp.editBatchSel].totalPrice=Number($('#iEditBatchTotalPrice').value)||0;
    });
    $('#iEditBatchRetiredRow')?.addEventListener('click',()=>{
      openDatePicker('#iEditBatchRetiredDate', $('#iEditBatchRetiredDate').value||todayStr());
    });
    $('#iEditBatchWarrantyRow')?.addEventListener('click',()=>{
      openDatePicker('#iEditBatchWarrantyDate', $('#iEditBatchWarrantyDate').value||todayStr());
    });
    // 生产日期：与其他页面一致，点击调出日期选择器（基准默认今天）
    $('#iEditBatchProductionRow')?.addEventListener('click',()=>{
      if(!temp.editBatchSel){ showToast('请先选择批次'); return; }
      openDatePicker('#iEditBatchProductionDate', $('#iEditBatchProductionDate').value||todayStr());
    });
    // 有效期：与其他页面一致，点击调出有效期选择器（基准=所选批次的生产日期，回退物品/今天）
    $('#iEditBatchExpiryRow')?.addEventListener('click',()=>{
      if(!temp.editBatchSel){ showToast('请先选择批次'); return; }
      const item=editTargetItem;
      const b=getItemBatches(item).find(x=>x.id===temp.editBatchSel);
      // 基准优先取编辑页当前(可能已被修改)的生产日期，其次批次/物品的生产日期，最后今天
      const m=temp.editBatchMap[temp.editBatchSel];
      const pd=(m&&m.productionDate)||(b&&b.productionDate)||(item&&item.productionDate)||todayStr();
      temp.editBatchExpiryProd=pd;
      openExpiryPicker('#iEditBatchExpiryDate', pd);
    });
    $('#iEditRetiredBatchCancel')?.addEventListener('click',()=>closeModal('iEditRetiredBatchModal'));
    $('#iEditRetiredBatchConfirm')?.addEventListener('click',()=>{
      if(temp.editBatchPickId) fillEditBatchArchive(temp.editBatchPickId);
      closeModal('iEditRetiredBatchModal');
    });
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
    // v92：本次维护金额（选填）—— 非数字则提示「累计维护支出中请输入金额」
    const maintRaw=($('#iEditMaintenance')?$('#iEditMaintenance').value:'').trim();
    if(maintRaw!=='' && !isFinite(Number(maintRaw))){ showToast('累计维护支出中请输入金额'); return; }
    const item=editTargetItem;
    item.name=name;
    item.icon=temp.selectedIcon||'📦';
    item.categoryId=temp.selectedCategory;
    item.location=$('#iEditLocation').value.trim().slice(0,100);
    item.memo=$('#iEditMemo')?$('#iEditMemo').value.trim().slice(0,300):(item.memo||'');   // v91：备注说明（与物品维护页一致）
    // v107：会员订阅 / 账号密码 → 写入专用字段（物品级）
    const vKindEdit=virtualKindFor(item.categoryId);
    if(vKindEdit){
      const vv=readEditVirtualValues();
      item.account=vv.account;
      if(vKindEdit==='member'){
        if(!vv.memberEnd){ showToast('请填写会员结束日期'); return; }
        item.memberStart=vv.memberStart;
        item.memberEnd=vv.memberEnd;
        temp.editVirtualMemberEnd=vv.memberEnd;             // 会员结束日期即有效期：在批次写回之后再同步（见下方）
      }else{
        item.password=vv.password;
      }
    }
    // 每批次档案：将每个批次编辑后的 单价 / 总价 / 退库日期 写回对应批次对象
    const sbatches=getItemBatches(item);
    sbatches.forEach(b=>{
      const m=temp.editBatchMap[b.id];
      if(m){
        b.unitPrice=Number(m.unitPrice)||0;
        b.totalPrice=Number(m.totalPrice)||0;
        b.retiredDate=m.retiredDate||'';
        b.warrantyDate=m.warrantyDate||'';
        b.expiryDate=m.expiryDate||'';
        b.productionDate=m.productionDate||'';
        if(m.expiryValue!=null && m.expiryValue!==''){ b.expiryValue=Number(m.expiryValue); b.expiryUnit=m.expiryUnit||'day'; }
      }
    });
    // v107：会员订阅 → 会员结束日期同时作为物品/批次有效期（放在批次写回之后，避免被旧值覆盖）
    if(vKindEdit==='member' && temp.editVirtualMemberEnd){
      item.expiryDate=temp.editVirtualMemberEnd;
      sbatches.forEach(b=>{ b.expiryDate=temp.editVirtualMemberEnd; });
    }
    // 兼容字段：物品级 总价 = 各批次总价之和；均价 = 最新批次单价
    item.totalPrice=sbatches.reduce((s,b)=>s+(Number(b.totalPrice)||0),0);
    item.price=getItemTotalIn(item)>0?item.totalPrice/getItemTotalIn(item):0;
    item.avgPrice=sbatches.length?Number(sbatches[sbatches.length-1].unitPrice||0):0;
    // v92：累计维护支出累加（不参与平均每日成本计算）
    if(maintRaw!=='') applyMaintenanceAmount(item, maintRaw);
    item.updatedAt=new Date().toISOString();
    item.photos=photosForSave('edit');   // v108：照片
    save();
    photoStaging.edit=[];
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
        renderOverview();
        renderCategoriesPage();
        refreshSyncStats();
        closeModal('iSyncModal');
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

  // 回填缺失的 id / updatedAt（legacy 数据）。
  // ⚠️ 关键：旧数据的物品/分类若没有 id，会在同步合并时被当作无效项【整条丢弃】，
  // 表现为"本地有 N 件、同步到云端却是 0 件"。这里补一个确定性 id（两端一致，不会重复）。
  function ensureSyncMeta(){
    const t=new Date().toISOString();
    let changed=false;
    const seenItems=new Set();
    state.items.forEach(it=>{
      if(!it) return;
      if(it.id){ seenItems.add(it.id); }
      else {
        const base='it_'+hash32((it.createdAt||'')+'|'+(it.purchaseDate||'')+'|'+(it.name||'')+'|'+(it.categoryId||''));
        let id=base, n=1; while(seenItems.has(id)){ id=base+'_'+(n++); }
        it.id=id; seenItems.add(id); changed=true;
      }
      if(!it.updatedAt){ it.updatedAt=t; changed=true; }
    });
    const seenCats=new Set();
    state.customCategories.forEach(c=>{
      if(!c) return;
      if(c.id){ seenCats.add(c.id); }
      else {
        const base='cat_'+hash32((c.name||'')+'|'+(c.parentId||''));
        let id=base, n=1; while(seenCats.has(id)){ id=base+'_'+(n++); }
        c.id=id; seenCats.add(id); changed=true;
      }
      if(!c.updatedAt){ c.updatedAt=t; changed=true; }
    });
    return changed;
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
          // Gitee 文件不存在时 GET 返回 []（数组），视为云端暂无数据
          if(Array.isArray(data)){ resolve({items:[],customCategories:[],deletedIds:[],empty:true}); return; }
          // Gitee 经 API 返回 base64 content；GitHub 经 raw 返回纯 JSON
          if(syncIsGitee() && data && data.content){
            try{ data=JSON.parse(unb64utf8(data.content)); }catch(e){ data={items:[],customCategories:[],deletedIds:[]}; }
          }
          resolve((data && Array.isArray(data.items))?data:{items:[],customCategories:[],deletedIds:[],empty:true});
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
      refreshSyncStats();
      showToast('已从云端同步（'+state.items.length+' 件）');
      setSyncStatus('云端更新于 '+fmtSyncTime(data.syncedAt));
      setSyncErr('✅ 云端已下载 '+(data.items||[]).length+' 件物品，合并后本地共 '+state.items.length+' 件');
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
      let cloudSha=null, cloudData={items:[], customCategories:[], deletedIds:[]}, cloudExists=false;
      if(api.ok){
        const j=await api.json();
        // Gitee 文件不存在时 GET 返回 []（数组）或 404；GitHub 返回 404。
        // 仅当返回带 content 的对象才表示文件已存在。
        if(j && !Array.isArray(j) && j.content){ cloudExists=true; cloudSha=j.sha||null; try{ cloudData=JSON.parse(unb64utf8(j.content)); }catch(e){} }
      } else if(api.status!==404){
        throw new Error('读取云端失败 HTTP '+api.status);
      }
      // 回填缺失的 id（旧数据）——这是同步能上传成功的关键；仅做"补全"，不删除/覆盖任何数据
      if(ensureSyncMeta()){ try{ save(); }catch(e){} }
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
      // Gitee 新建文件用 POST，更新已有文件用 PUT；GitHub 统一 PUT（无 sha 即新建）
      const syncMethod=(syncIsGitee() && !cloudExists) ? 'POST' : 'PUT';
      const pu=await retryFetch(syncApiUrl(), {
        method:syncMethod,
        headers:syncHeaders({'Content-Type':'application/json'}),
        body: JSON.stringify(body)
      }, 3, 18000);
      if(!pu.ok){ const er=await pu.json().catch(()=>({})); throw new Error('上传失败 HTTP '+pu.status+(er&&er.message?(' '+er.message):'')); }
      showToast('已同步到云端（'+uploadItems.length+' 件）');
      setSyncStatus('云端更新于 '+fmtSyncTime(payload.syncedAt));
      setSyncErr((uploadItems.length===0 && state.items.length>0)
        ? '⚠️ 本地有 '+state.items.length+' 件但上传 0 件（数据缺少 id，已自动修复）。请再点一次「同步到云端」。'
        : '✅ 已成功上传到 '+syncBackendLabel()+' 云端');
      renderOverview(); renderCategoriesPage();
      refreshSyncStats();
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
    refreshSyncStats();
    // 后台探一下云端时间
    pullCloudData().then(d=>{ if(!d.empty) setSyncStatus('云端更新于 '+fmtSyncTime(d.syncedAt)); }).catch(()=>{});
    openModal('iSyncModal');
  }
  function countSyncStats(){
    let batches=0, usings=0;
    (state.items||[]).forEach(it=>{ batches+=(it.batches||[]).length; usings+=(it.usings||[]).length; });
    return {items:(state.items||[]).length, batches, usings};
  }
  // v98：同步弹窗里的「件物品 / 个批次 / 条取用记录」三行统计。
  // 原先只在打开弹窗时写入一次，导致「从云端下载」成功后弹窗内仍显示 0，
  // 看起来像"提示已下载但没有任何数据"。凡本地数据发生变化后都要刷新。
  function refreshSyncStats(){
    const counts=countSyncStats();
    const ic=document.getElementById('iSyncItemCount'); if(ic) ic.textContent=counts.items;
    const bc=document.getElementById('iSyncBatchCount'); if(bc) bc.textContent=counts.batches;
    const uc=document.getElementById('iSyncUsingCount'); if(uc) uc.textContent=counts.usings;
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
  function openModal(id){
    const el=$('#'+id);
    if(!el) return;
    el.classList.add('show');
    // 移动端：把弹窗压入 history 一层，让系统滑动返回可逐级关闭弹窗
    if(isMobileView() && modalNav.stack.indexOf(id)===-1){
      modalNav.stack.push(id);
      history.pushState({ modal:true, id:id }, '');
    }
  }
  function closeModal(id){
    const el=$('#'+id);
    if(el) el.classList.remove('show');
    modalNav.remove(id);
    // 移动端：若当前 history 顶层正是该弹窗，则弹回上一层（不穿透到页面）
    if(isMobileView() && history.state && history.state.modal && history.state.id===id){
      window.__suppressModalPop = true;
      history.back();
    }
  }

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

  // 物品单位（v88）：允许值按「单位类型」排序（计件/容量/重量/包装/车辆），界面不显示分组标题
  const UNIT_OPTIONS=['件','个','套','组','张','ml','l','mg','g','kg','瓶','罐','桶','箱','盒','包','袋','卷','捆','辆'];
  const DEFAULT_UNIT='件';
  function currentBatchUnit(){ return ($('#iBatchUnit')||{}).value||DEFAULT_UNIT; }
  function setBatchUnit(unit){
    const u=unit||DEFAULT_UNIT;
    const el=$('#iBatchUnit');
    if(el) el.value=u;
    const txt=$('#iBatchUnitText');
    if(txt) txt.textContent=u;
  }
  function renderUnitOptions(){
    const cur=currentBatchUnit();
    const box=$('#iUnitOptions');
    if(!box) return;
    box.innerHTML=UNIT_OPTIONS.map(u=>
      `<button type="button" class="i-option ${u===cur?'active':''}" data-unit="${escapeHtml(u)}">${escapeHtml(u)}</button>`
    ).join('');
    $$('#iUnitOptions .i-option').forEach(btn=>{
      btn.addEventListener('click', ()=>{ setBatchUnit(btn.dataset.unit); closeModal('iUnitModal'); });
    });
  }
  function openUnitModal(){
    renderUnitOptions();
    openModal('iUnitModal');
  }

  function openCategoryPicker(){
    // 滚轮式分类选择器：左侧一级（自定义一级 + 系统一级），右侧二级（随一级联动）
    const customs=customPrimaryCategories().filter(c=>c.id!==UNCATEGORIZED_ID);
    temp.wheelList=[
      ...customs.map(c=>({id:c.id,name:c.name})),
      ...SYSTEM_PRIMARY.map(p=>({id:p.id,name:p.name}))
    ];
    // 当前选中可能是二级分类，映射回其一级 + 记住二级
    let curId=temp.selectedCategory, curSubId=null;
    if(curId){
      const path=getCategoryPath(curId);
      curSubId=path.secondaryId||null;
      curId=path.primaryId;
    }
    const idx=temp.wheelList.findIndex(c=>c.id===curId);
    temp.wheelIndex=idx>=0?idx:0;
    const cur=temp.wheelList[temp.wheelIndex];
    temp.wheelSubList=cur?buildSubWheelList(cur.id):[];
    const si=curSubId?temp.wheelSubList.findIndex(s=>s.id===curSubId):0;
    temp.wheelSubIndex=si>=0?si:0;
    renderCatWheel();
    renderSubWheel();
    openModal('iCategoryModal');
    // 隐藏态(display:none)下设置 scrollTop 无效，等弹层可见后再滚动到选中项
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      const wheel=$('#iCatWheel');
      if(wheel) wheel.scrollTop=temp.wheelIndex*WHEEL_ITEM_H;
      const wheel2=$('#iCatWheel2');
      if(wheel2 && !wheel2.hidden) wheel2.scrollTop=temp.wheelSubIndex*WHEEL_ITEM_H;
    }));
  }

  const WHEEL_ITEM_H=48;
  const SUB_ONLY_PRIMARY='__primary_only__';   // 二级滚轮首项：只选一级（显示为「全部」）

  // 二级候选：系统一级取其系统二级；自定义一级取其自定义子分类
  function buildSubWheelList(primaryId){
    let subs=[];
    if(SYSTEM_SECONDARY[primaryId]){
      subs=getSystemSecondary(primaryId).map(c=>({id:c.id,name:c.name}));
    }else{
      subs=customChildren(primaryId).map(c=>({id:c.id,name:c.name}));
    }
    return [{id:SUB_ONLY_PRIMARY,name:'全部'}].concat(subs);
  }

  // 一级变化后重建二级滚轮（keepSub=保持已选二级，找不到则回落到首项）
  function resetSubWheelForPrimary(keepSub){
    const keepId=keepSub?((temp.wheelSubList||[])[temp.wheelSubIndex]||{}).id:null;
    const p=(temp.wheelList||[])[temp.wheelIndex];
    temp.wheelSubList=p?buildSubWheelList(p.id):[];
    const i=keepId?temp.wheelSubList.findIndex(s=>s.id===keepId):0;
    temp.wheelSubIndex=i>=0?i:0;
    renderSubWheel();
  }

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
        resetSubWheelForPrimary(false);   // 换一级 → 二级回到「全部」
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
            resetSubWheelForPrimary(false);
          }
        }, 80);
      });
      wheel._bound=true;
    }
  }

  function renderSubWheel(scrollToSelected){
    const wheel=$('#iCatWheel2');
    if(!wheel) return;
    const list=temp.wheelSubList||[];
    const hasSub=list.length>1;                  // 只有「全部」时隐藏该列
    wheel.hidden=!hasSub;
    if(!hasSub){ wheel.innerHTML=''; return; }
    const pad=h=>`<div style="height:${h}px;flex:none"></div>`;
    wheel.innerHTML=pad(WHEEL_ITEM_H*2)+list.map((c,i)=>
      `<div class="i-wheel-item ${i===temp.wheelSubIndex?'active':''}" data-idx="${i}">${escapeHtml(c.name)}</div>`
    ).join('')+pad(WHEEL_ITEM_H*2);
    $$('.i-wheel-item', wheel).forEach(el=>{
      el.addEventListener('click', ()=>{
        temp.wheelSubIndex=Number(el.dataset.idx);
        $$('.i-wheel-item', wheel).forEach(x=>x.classList.toggle('active', Number(x.dataset.idx)===temp.wheelSubIndex));
        centerWheel(wheel, temp.wheelSubIndex);
      });
    });
    if(scrollToSelected){
      wheel.scrollTop=temp.wheelSubIndex*WHEEL_ITEM_H;
    }
    if(!wheel._bound){
      let t;
      wheel.addEventListener('scroll', ()=>{
        clearTimeout(t);
        t=setTimeout(()=>{
          const max=(temp.wheelSubList||[]).length-1;
          const idx=Math.max(0, Math.min(max, Math.round(wheel.scrollTop/WHEEL_ITEM_H)));
          if(idx!==temp.wheelSubIndex){
            temp.wheelSubIndex=idx;
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
      const el=$(temp.dateTarget);
      if(el){
        el.value=temp.dateValue;
        // 补货入库弹窗的日期行用 span 展示，需同步 textContent 才能在界面看到所选日期
        if(temp.dateTarget==='#iRestockDate' || temp.dateTarget==='#iRestockProductionDate'){
          el.textContent=formatDateDot(temp.dateValue);
        }
        // 补货入库「退库日期」：span 展示 + 写入临时变量
        if(temp.dateTarget==='#iRestockRetiredDate'){
          el.textContent=formatDateDot(temp.dateValue);
          temp.restockRetiredDate=temp.dateValue;
        }
        // 补货入库「质保期」：span 展示 + 写入临时变量
        if(temp.dateTarget==='#iRestockWarrantyDate'){
          el.textContent=formatDateDot(temp.dateValue);
          temp.restockWarrantyDate=temp.dateValue;
        }
        // v107：编辑页「会员开始日期 / 会员结束日期」→ 同步右侧展示文字
        if(temp.dateTarget==='#iEditV_memberStart' || temp.dateTarget==='#iEditV_memberEnd'){
          const key=temp.dateTarget.replace('#iEditV_','');
          const t=$('#iEditVt_'+key);
          if(t) t.textContent=formatDateDot(temp.dateValue);
        }
        // 编辑页「每批次档案 - 退库日期」：写入当前选中批次的退库日期
        if(temp.dateTarget==='#iEditBatchRetiredDate'){
          const txt=$('#iEditBatchRetiredDateText');
          if(txt) txt.textContent=formatDateDot(temp.dateValue);
          if(temp.editBatchSel && temp.editBatchMap[temp.editBatchSel]){
            temp.editBatchMap[temp.editBatchSel].retiredDate=temp.dateValue;
          }
        }
        // 编辑页「每批次档案 - 质保期」：写入当前选中批次的质保期
        if(temp.dateTarget==='#iEditBatchWarrantyDate'){
          const wtxt=$('#iEditBatchWarrantyDateText');
          if(wtxt) wtxt.textContent=formatDateDot(temp.dateValue);
          if(temp.editBatchSel && temp.editBatchMap[temp.editBatchSel]){
            temp.editBatchMap[temp.editBatchSel].warrantyDate=temp.dateValue;
          }
        }
        // 编辑页「每批次档案 - 生产日期」：写入当前选中批次的生产日期；
        // 生产日期一旦修改，有效期同步重算（与其它页面「生产日期→有效期」联动逻辑一致）：
        //   ① 本次已选过有效期时长 → 用「新生产日期 + 该时长」重算；
        //   ② 未选过 → 沿用原「生产日期→有效期」的间隔(天)平移到新生产日期。
        if(temp.dateTarget==='#iEditBatchProductionDate'){
          const newProd=temp.dateValue;
          const ptxt=$('#iEditBatchProductionDateText');
          if(ptxt) ptxt.textContent=formatDateDot(newProd);
          const bsel=temp.editBatchSel;
          const bm=bsel?(temp.editBatchMap[bsel]||null):null;
          if(bm){
            const oldProd=bm.productionDate||(editTargetItem&&editTargetItem.productionDate)||'';
            const oldExp=bm.expiryDate||'';
            bm.productionDate=newProd;
            // 有效期时长：优先本次选择，其次该批次已保存的时长(单位精确)，最后按天间隔平移
            let spec=(temp.expirySpec||{})['#iEditBatchExpiryDate'];
            if((!spec || !spec.value) && bm.expiryValue){
              spec={ value:Number(bm.expiryValue), unit:bm.expiryUnit||'day' };
            }
            let res='';
            if(spec && spec.value){
              res=computeExpiryDate(newProd, spec.value, spec.unit);
            }else if(oldExp && oldProd){
              const days=daysDiff(oldProd, oldExp);
              if(days>0){
                const d=parseDate(newProd);
                d.setDate(d.getDate()+days);
                res=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
              }
            }
            if(res){
              bm.expiryDate=res;
              temp.editBatchExpiryProd=newProd;
              const eInput=$('#iEditBatchExpiryDate');
              const eText=$('#iEditBatchExpiryDateText');
              if(eInput) eInput.value=res;
              if(eText) eText.textContent=formatDateDot(res);
            }
          }
        }
        // 有效期联动：生产日期改动后，按已维护的有效期时长重新计算有效期
        if(temp.dateTarget==='#iProductionDate') recalcExpiryFromProduction('#iProductionDate', '#iExpiryDate');
        if(temp.dateTarget==='#iBatchProductionDate') recalcExpiryFromProduction('#iBatchProductionDate', '#iBatchExpiryDate');
      }
    }
    closeModal('iDateModal');
  }

  // 解析「有效期」的基准日期：永远以【生产日期】为基准（各页面取对应的生产日期字段）
  function resolveExpiryBase(targetId, productionDate){
    let d='';
    if(targetId==='#iExpiryDate') d=$('#iProductionDate').value;
    else if(targetId==='#iRestockExpiry') d=$('#iRestockProductionDate').value;
    else if(targetId==='#iEditBatchExpiryDate') d=temp.editBatchExpiryProd||$('#iProductionDate').value;
    else d=$('#iBatchProductionDate').value;
    return d||productionDate||'';
  }
  function openExpiryPicker(targetId, productionDate){
    temp.dateTarget=targetId;
    temp.expiryValue='';
    temp.expiryUnit='day';
    $('#iExpiryInput').value='';
    $$('#iExpiryUnits button').forEach(b=>b.classList.toggle('active', b.dataset.unit==='day'));
    // 每次打开都重新取【生产日期】作为基准：无论这一行之前填过几次有效期，都从生产日期重算，不会在旧有效期上叠加
    let base=resolveExpiryBase(targetId, productionDate);
    const fallback=!base;
    if(fallback) base=todayStr();
    temp.expiryBaseDate=base;
    const hint=$('#iExpiryBaseText');
    if(hint) hint.textContent='基准日期：'+formatDateDot(base)+(fallback?'（未填生产日期，暂按今天）':'（生产日期）');
    openModal('iExpiryModal');
  }
  function setExpiryUnit(unit){
    temp.expiryUnit=unit;
    $$('#iExpiryUnits button').forEach(b=>b.classList.toggle('active', b.dataset.unit===unit));
  }
  // 有效期计算：基准日期（生产日期）+ 时长（天/月/年）→ YYYY-MM-DD
  function computeExpiryDate(pd, v, unit){
    if(!pd || !v) return '';
    if(unit==='day'){
      const d=parseDate(pd); d.setDate(d.getDate()+v);
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    }else if(unit==='month'){
      return addMonthsSafe(pd, v);
    }
    return addYearsSafe(pd, v);
  }
  // 生产日期变更后：用已维护的有效期时长重算有效期（先选了 3 年、再改生产日期也要跟着变）
  function recalcExpiryFromProduction(prodSel, expirySel){
    const spec=(temp.expirySpec||{})[expirySel];
    if(!spec || !spec.value) return;
    const pd=$(prodSel).value;
    if(!pd) return;
    const res=computeExpiryDate(pd, spec.value, spec.unit);
    if(res) $(expirySel).value=res;
  }
  function confirmExpiryPicker(){
    const v=Number($('#iExpiryInput').value);
    if(!v || v<=0){ showToast('请输入有效数字'); return; }
    // 基准日期：每次确认都【重新】从对应的生产日期字段实时解析（v80 加固）——
    // 绝不以「当前有效期字段的值」为基准，避免 6年→2031、再填10年→2043 这类叠加错误
    let pd=resolveExpiryBase(temp.dateTarget,'')||temp.expiryBaseDate;
    if(!pd){
      if(temp.dateTarget==='#iEditBatchExpiryDate') pd=todayStr();
      else { showToast('请先设置生产日期'); return; }
    }
    const res=computeExpiryDate(pd, v, temp.expiryUnit);
    // 记住本次选择的时长，供之后修改生产日期时自动重算有效期
    if(!temp.expirySpec) temp.expirySpec={};
    temp.expirySpec[temp.dateTarget]={ value:v, unit:temp.expiryUnit };
    $(temp.dateTarget).value=res;
    // 补货入库弹窗的有效期为 span 展示，需同步 textContent 才能在界面看到计算后的日期
    if(temp.dateTarget==='#iRestockExpiry'){ $(temp.dateTarget).textContent=formatDateDot(res); }
    // 编辑页每批次档案：有效期用隐藏 input 存值，需同步展示文字并写回临时批次映射
    if(temp.dateTarget==='#iEditBatchExpiryDate'){
      $('#iEditBatchExpiryDateText').textContent=formatDateDot(res);
      if(temp.editBatchSel && temp.editBatchMap[temp.editBatchSel]){
        temp.editBatchMap[temp.editBatchSel].expiryDate=res;
        // 记住时长(含单位)，供之后修改生产日期时精确重算
        temp.editBatchMap[temp.editBatchSel].expiryValue=v;
        temp.editBatchMap[temp.editBatchSel].expiryUnit=temp.expiryUnit;
      }
    }
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
    bindPhotoEvents();   // v108：照片（拍照/相册）

    // overview
    $('#iEyeBtn')?.addEventListener('click',()=>{ state.settings.hideAmount=!state.settings.hideAmount; save(); renderOverview(); });
    $('#iFilterBtn')?.addEventListener('click', openFilterModal);
    $('#iSortBtn')?.addEventListener('click', openSortModal);
    $('#iGalleryBtn')?.addEventListener('click',()=>{ state.settings.viewMode=state.settings.viewMode==='grid'?'list':'grid'; save(); renderOverview(); });
    $('#iAddItemFab')?.addEventListener('click',()=>openAddItem('single'));
    $('#iExpiringMore')?.addEventListener('click',()=>showSubpage('expiring'));

    // 今日页（v99）：搜索 + 补货清单
    $('#iTodaySearch')?.addEventListener('input', e=>{
      todaySearchTerm=(e.target.value||'').trim();
      const clear=$('#iTodaySearchClear');
      if(clear) clear.style.display=e.target.value?'flex':'none';
      renderTodayPage();
    });
    $('#iTodaySearchClear')?.addEventListener('click', ()=>{
      todaySearchTerm='';
      const input=$('#iTodaySearch');
      if(input) input.value='';
      const clear=$('#iTodaySearchClear');
      if(clear) clear.style.display='none';
      renderTodayPage();
      if(input) input.focus();
    });
    $('#iTodayShopPill')?.addEventListener('click', openShopModal);
    // v105：分类物品弹窗 →「用此分类添加物品」
    $('#iCatItemsAddBtn')?.addEventListener('click', ()=>{
      const catId=catItemsTargetId;
      closeModal('iCatItemsModal');
      openAddItem('single', null, catId);
    });
    $('#iShopClearBtn')?.addEventListener('click', ()=>{
      shopSave([]);
      renderShopModal();
      renderTodayPage();
      showToast('补货清单已清空');
    });
    $('#iCatBackBtn')?.addEventListener('click',()=>showSubpage('overview'));
    // 到期清单页的「返回」按钮已按要求删除（通过左侧导航/底部栏返回）
    $('#iBatchArchiveBackBtn')?.addEventListener('click',()=>showSubpage('expiring'));
    $('#iDetailBack')?.addEventListener('click',()=>{ const st=history.state; if(st && st.lvl===2) history.back(); else showSubpage('overview'); });

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
    $('#iBatchUnitTrigger')?.addEventListener('click', openUnitModal);
    $('#iCatWheelCancel')?.addEventListener('click',()=>closeModal('iCategoryModal'));
    $('#iCatWheelConfirm')?.addEventListener('click',()=>{
      const p=(temp.wheelList||[])[temp.wheelIndex];
      const s=(temp.wheelSubList||[])[temp.wheelSubIndex];
      if(p){
        // 二级滚轮停在具体项 → 存二级分类 id；停留在「全部」→ 只存一级分类 id
        temp.selectedCategory=(s && s.id!==SUB_ONLY_PRIMARY) ? s.id : p.id;
        updateCategoryTrigger();
        if(editTargetItem) updateEditCategoryUI();
      }
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

    // batch total auto
    // 单价 × 数量 → 总价；若【单价未填】而已填总价，则反算 单价 = 总价/数量（v80）
    function updateBatchTotal(){
      const qty=Math.max(0, parseInt($('#iQty').value)||0);
      const price=Number($('#iBatchUnitPrice').value)||0;
      const totalEl=$('#iBatchTotalPrice');
      if(document.activeElement===totalEl) return;              // 正在编辑总价，不覆盖
      if(price>0){
        totalEl.value=(qty*price).toFixed(2);
      }else{
        const t=Number(totalEl.value)||0;
        if(t>0 && qty>0){
          const unit=Math.round((t/qty)*100)/100;
          $('#iBatchUnitPrice').value=unit.toFixed(2);          // 总价/数量，回填单价
        }else{
          totalEl.value='';
        }
      }
    }
    // 总价输入时：单价为空则实时反算单价（总价/数量）
    $('#iBatchTotalPrice')?.addEventListener('input', ()=>{
      const qty=Math.max(0, parseInt($('#iQty').value)||0);
      const t=Number($('#iBatchTotalPrice').value)||0;
      if(!$('#iBatchUnitPrice').value.trim() && t>0 && qty>0){
        $('#iBatchUnitPrice').value=(Math.round((t/qty)*100)/100).toFixed(2);
      }
    });
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
      modal.addEventListener('click', e=>{ if(e.target===modal) closeModal(modal.id); });
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
