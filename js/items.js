/* ==========================================
   物品统计模块 · PersonalWorkbench Items v2
   ========================================== */
(function () {
  'use strict';

  const ITEMS_KEY = 'wb_items_v2';
  const CATS_KEY = 'wb_item_categories_v2';
  const SETTINGS_KEY = 'wb_items_settings_v2';

  const UNCATEGORIZED_ID = 'cat_uncategorized';

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
    if(icon.includes('/') || icon.startsWith('data:')){
      return `<img src="${icon}" class="i-icon-img${cls?' '+cls:''}" alt="${escapeHtml(alt)}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='inline'">` +
             `<span class="i-icon-fallback${cls?' '+cls:''}" style="display:none">📁</span>`;
    }
    return `<span class="i-icon-emoji${cls?' '+cls:''}">${icon}</span>`;
  }
  function showToast(msg){
    let toast=document.getElementById('toast');
    if(!toast){ toast=document.createElement('div'); toast.id='toast'; toast.className='toast'; document.body.appendChild(toast); }
    toast.textContent=msg;
    toast.classList.add('show');
    clearTimeout(showToast._timer);
    showToast._timer=setTimeout(()=>toast.classList.remove('show'),2000);
  }

  /* ===== 数据持久化 ===== */
  function load(){
    try{
      state.items=JSON.parse(localStorage.getItem(ITEMS_KEY))||[];
      state.customCategories=JSON.parse(localStorage.getItem(CATS_KEY))||[];
      state.settings=Object.assign(state.settings, JSON.parse(localStorage.getItem(SETTINGS_KEY))||{});
    }catch(e){ console.warn('items load failed',e); }
    ensureUncategorized();
  }
  function save(){
    localStorage.setItem(ITEMS_KEY, JSON.stringify(state.items));
    localStorage.setItem(CATS_KEY, JSON.stringify(state.customCategories));
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
  }
  function ensureUncategorized(){
    if(!state.customCategories.find(c=>c.id===UNCATEGORIZED_ID)){
      state.customCategories.unshift({ id:UNCATEGORIZED_ID, name:'未分类', icon:'📁', system:false });
    }
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
  function groupItems(items){
    const map={};
    let totalAsset=0, avgDailyCost=0;
    items.forEach(item=>{
      const tp=itemTotalPrice(item);
      totalAsset+=tp;
      if(item.expiryDate) avgDailyCost+=itemDailyCost(item);
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
          items:[]
        };
      }
      const g=map[key];
      g.qty+=Number(item.qty||1);
      g.totalPrice+=tp;
      g.stockQty+=Number(item.stockQty||0);
      g.inUseQty+=Number(item.inUseQty||0);
      g.scrappedQty+=Number(item.scrappedQty||0);
      g.retiredQty+=Number(item.retiredQty||0);
      g.dailyCost+=item.expiryDate?itemDailyCost(item):0;
      g.usageCount+=Number(item.usageCount||0);
      g.purchaseDates.push(item.purchaseDate);
      g.starred=g.starred||!!item.starred;
      g.items.push(item);
    });
    const groups=Object.values(map);
    groups.forEach(g=>{
      g.avgPrice=g.qty?g.totalPrice/g.qty:0;
      g.purchaseDates.sort();
      g.purchaseDate=g.purchaseDates[0];
      g.holdingDays=daysDiff(g.purchaseDate, todayStr());
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
      galleryBtn.innerHTML=`${isGrid?listSvg():gridSvg()} <span>${isGrid?'画廊':'网格'}</span>`;
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
        if(e.target.closest('button, .i-star')) return;
        const key=card.dataset.key;
        const { groups }=groupItems(state.items);
        const g=groups.find(gg=>gg.key===key);
        if(g) showDetail(g);
      });
    });
    $$('.i-star', ctx).forEach(btn=>{
      btn.addEventListener('click', e=>{
        e.stopPropagation();
        const key=btn.dataset.key;
        const { groups }=groupItems(state.items);
        const g=groups.find(gg=>gg.key===key);
        if(!g) return;
        const newStar=!g.starred;
        g.items.forEach(it=>it.starred=newStar);
        save(); renderOverview();
      });
    });
    $$('.i-action-archive', ctx).forEach(btn=>{
      btn.addEventListener('click', e=>{
        e.stopPropagation();
        showToast('已归档（演示）');
      });
    });
    $$('.i-action-share', ctx).forEach(btn=>{
      btn.addEventListener('click', e=>{
        e.stopPropagation();
        showToast('分享链接已复制（演示）');
      });
    });
  }

  /* ===== HTML 片段 ===== */
  function gridCardHtml(g){
    const batch=g.qty>1?`<span class="i-batch-badge">批量</span>`:'';
    return `
    <div class="i-grid-card" data-key="${g.key}">
      ${batch}
      <div class="i-star ${g.starred?'active':''}" data-key="${g.key}">${starSvg()}</div>
      <div class="i-grid-icon">${renderIcon(g.icon, g.name)}</div>
      <div class="i-grid-name">${escapeHtml(g.name)}</div>
      <div class="i-grid-daily"><span>¥</span><strong>${g.dailyCost.toFixed(2)}</strong><span>/日</span></div>
      <div class="i-grid-actions">
        <button class="i-action-archive" aria-label="归档">${archiveSvg()}</button>
        <button class="i-action-share" aria-label="分享">${shareSvg()}</button>
      </div>
    </div>`;
  }
  function listCardHtml(g, forceExpired=false, days=0, expired=false){
    const isExpired=forceExpired||expired;
    const badge=isExpired?`<span class="i-expired-badge">已过期 ${days} 天</span>`:'';
    const batch=g.qty>1?`<span class="i-batch-badge">批量</span>`:'';
    const metaIcon = g.dailyCost>0? diamondSvg():clockSvg();
    return `
    <div class="i-list-card ${isExpired?'expired':''}" data-key="${g.key}">
      ${batch}
      <div class="i-list-star ${g.starred?'active':''}" data-key="${g.key}">${starSvg()}</div>
      ${badge}
      <div class="i-list-left">${renderIcon(g.icon, g.name)}</div>
      <div class="i-list-right">
        <div class="i-list-name">${escapeHtml(g.name)}</div>
        <div class="i-list-daily">
          <span class="i-label">日均成本</span>
          <span class="i-currency">¥</span>
          <span class="i-amount">${g.dailyCost.toFixed(2)}</span>
          <span class="i-unit">/日</span>
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
            <button class="i-action-archive" aria-label="归档">${archiveSvg()}</button>
            <button class="i-action-share" aria-label="分享">${shareSvg()}</button>
          </div>
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
      $('#iName').value=editItem.name;
      $('#iPrice').value=editItem.price||'';
      $('#iExpectedDaily').value=editItem.expectedDaily||'';
      $('#iProductionDate').value=editItem.productionDate||todayStr();
      $('#iPurchaseDate').value=editItem.purchaseDate||todayStr();
      $('#iRetireDate').value=editItem.retireDate||'';
      $('#iExpiryDate').value=editItem.expiryDate||'';
      $('#iUsageCount').value=editItem.usageCount||'';
      $('#iMaintenance').value=editItem.maintenanceTotal||'';
      $('#iLocation').value=editItem.location||'';
      $('#iMemo').value=editItem.memo||'';
      $('#iCalcTime').checked=(editItem.calcMode||'time')==='time';
      $('#iCalcFreq').checked=editItem.calcMode==='freq';
      $('#iCalcNone').checked=editItem.calcMode==='none';

      $('#iBatchName').value=editItem.name;
      $('#iQty').value=editItem.qty||1;
      $('#iBatchUnitPrice').value=editItem.price||'';
      $('#iBatchTotalPrice').value=editItem.totalPrice||'';
      $('#iBatchProductionDate').value=editItem.productionDate||todayStr();
      $('#iBatchPurchaseDate').value=editItem.purchaseDate||todayStr();
      $('#iBatchExpiryDate').value=editItem.expiryDate||'';
      $('#iBatchLocation').value=editItem.location||'';
      $('#iBatchMemo').value=editItem.memo||'';
      if(editItem.autoTakeOne) $('#iAutoTakeOne').classList.add('on');
    }else{
      $('#iCalcTime').checked=true;
    }
    updateCategoryTrigger();
    updateIconBtn();
    showSubpage('add');
  }

  function updateCategoryTrigger(){
    const cat=getCategory(temp.selectedCategory);
    const display=$('#iCategoryTrigger .i-value');
    if(!cat) display.innerHTML='<span class="i-placeholder">请选择分类</span>';
    else{
      const path=getCategoryPath(cat.id);
      display.textContent=path.secondaryName?`${path.primaryName} > ${path.secondaryName}`:path.primaryName;
    }
  }
  function updateIconBtn(){
    $('#iIconBtn').textContent=temp.selectedIcon;
    $('#iBatchIconBtn').textContent=temp.selectedIcon;
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
    item.updatedAt=new Date().toISOString();

    if(isBatch){
      const qty=Math.max(0, parseInt($('#iQty').value)||0);
      const price=Number($('#iBatchUnitPrice').value)||0;
      const total=Number($('#iBatchTotalPrice').value)||(qty*price);
      item.qty=qty;
      item.price=price;
      item.totalPrice=total;
      item.expiryDate=$('#iBatchExpiryDate').value;
      if(!item.expiryDate){ showToast('请填写有效期'); return; }
      const auto=$('#iAutoTakeOne').classList.contains('on');
      item.autoTakeOne=auto;
      item.stockQty=qty-(auto?1:0);
      item.inUseQty=auto?1:0;
      item.scrappedQty=0;
      item.retiredQty=0;
      item.calcMode='time';
      item.usageCount=0;
    }else{
      item.qty=1;
      item.price=Number($('#iPrice').value)||0;
      item.totalPrice=item.price;
      item.expectedDaily=Number($('#iExpectedDaily').value)||0;
      item.retireDate=$('#iRetireDate').value||undefined;
      item.expiryDate=$('#iExpiryDate').value;
      if(!item.expiryDate){ showToast('请填写有效期'); return; }
      item.calcMode=$('#iCalcFreq').checked?'freq':($('#iCalcNone').checked?'none':'time');
      item.usageCount=Number($('#iUsageCount').value)||0;
      item.maintenanceTotal=Number($('#iMaintenance').value)||0;
      item.stockQty=1;
      item.inUseQty=0;
      item.scrappedQty=0;
      item.retiredQty=0;
      item.autoTakeOne=false;
    }

    if(temp.editId){
      const idx=state.items.findIndex(it=>it.id===temp.editId);
      state.items[idx]=item;
    }else{
      state.items.push(item);
    }
    save();
    showToast(temp.editId?'已保存':'已添加');
    showSubpage('overview');
  }

  /* ===== 详情弹层 ===== */
  function showDetail(g){
    const item=g.items[0];
    const path=getCategoryPath(item.categoryId);
    const modal=$('#iDetailModal');
    $('#iDetailIcon').textContent=g.icon;
    $('#iDetailName').textContent=g.name;
    $('#iDetailCat').textContent=path.secondaryName?`${path.primaryName} > ${path.secondaryName}`:path.primaryName;
    $('#iDetailTotal').textContent=formatMoney(g.totalPrice);
    $('#iDetailDaily').textContent=formatMoney(g.dailyCost)+'/日';
    $('#iDetailQty').textContent=g.qty;
    $('#iDetailExpiry').textContent=item.expiryDate||'-';

    modal.classList.add('show');

    $('#iDetailUse').onclick=()=>{ changeStatus(g,'use'); };
    $('#iDetailScrap').onclick=()=>{ changeStatus(g,'scrap'); };
    $('#iDetailRetire').onclick=()=>{ changeStatus(g,'retire'); };
    $('#iDetailEdit').onclick=()=>{ modal.classList.remove('show'); openAddItem(item.qty>1?'batch':'single', item); };
    $('#iDetailDelete').onclick=()=>{ if(confirm('确定删除该物品记录？')){ deleteItems(g); modal.classList.remove('show'); renderOverview(); } };
  }
  function changeStatus(g, type){
    // take 1 from stock and move to target status for first item with stock
    const target=g.items.find(it=>(it.stockQty||0)>0);
    if(!target){ showToast('库存不足'); return; }
    target.stockQty-=1;
    if(type==='use') target.inUseQty=(target.inUseQty||0)+1;
    if(type==='scrap') target.scrappedQty=(target.scrappedQty||0)+1;
    if(type==='retire') target.retiredQty=(target.retiredQty||0)+1;
    save();
    showToast('状态已更新');
    $('#iDetailModal').classList.remove('show');
    renderOverview();
  }
  function deleteItems(g){
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
  function renderMyCategories(){
    const term=($('#iCatSearch').value||'').trim().toLowerCase();
    const list=$('#iMyCategories');
    const primaries=customPrimaryCategories().filter(p=>{
      if(p.id===UNCATEGORIZED_ID) return false;
      if(!term) return true;
      return p.name.toLowerCase().includes(term) || customChildren(p.id).some(c=>c.name.toLowerCase().includes(term));
    });

    if(primaries.length===0){
      list.innerHTML=`<div class="i-empty"><p>暂无自定义分类，点击上方按钮新增</p></div>`;
      return;
    }
    list.innerHTML=primaries.map(p=>{
      const children=customChildren(p.id).filter(c=>!term || c.name.toLowerCase().includes(term) || p.name.toLowerCase().includes(term));
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
    $('#iSysChipRow').innerHTML=[{id:'all',name:'全部',icon:''},...SYSTEM_PRIMARY].map(p=>
      `<button class="i-chip ${selected===p.id?'active':''}" data-id="${p.id}">${p.name}</button>`
    ).join('');
    $$('#iSysChipRow .i-chip').forEach(btn=>{
      btn.addEventListener('click',()=>{ state.settings.sysCatChip=btn.dataset.id; save(); renderSystemCategories(); });
    });

    let list=[];
    if(selected==='all'){
      SYSTEM_PRIMARY.forEach(p=>list.push(...getSystemSecondary(p.id)));
    }else{
      list=getSystemSecondary(selected);
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
    $('#iPickerChips').innerHTML=SYSTEM_PRIMARY.map(p=>`
      <button type="button" class="i-picker-chip ${selected===p.id?'active':''}" data-id="${p.id}">${escapeHtml(p.name)}</button>
    `).join('');
    $$('#iPickerChips .i-picker-chip').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        temp.pickerPrimary=btn.dataset.id;
        renderCatIconPicker();
      });
    });

    const list=getSystemSecondary(selected);
    $('#iPickerGrid').innerHTML=list.map(c=>`
      <button type="button" class="${c.icon===temp.selectedIcon?'selected':''}" data-icon="${escapeHtml(c.icon)}">
        ${renderIcon(c.icon, c.name)}
      </button>
    `).join('');
    $$('#iPickerGrid button').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        temp.selectedIcon=btn.dataset.icon;
        updateChildIconPreview();
        closeModal('iCatIconPickerModal');
      });
    });
  }

  function openCategoryPicker(){
    renderCategoryPicker();
    openModal('iCategoryModal');
  }
  function renderCategoryPicker(){
    const container=$('#iCategoryList');
    let html='';
    // system
    SYSTEM_PRIMARY.forEach(p=>{
      html+=`<div class="i-cat-picker-group">
        <div class="i-cat-picker-title">${renderIcon(p.icon, p.name)} ${escapeHtml(p.name)}</div>
        <div class="i-cat-picker-children">
          ${getSystemSecondary(p.id).map(c=>`<button class="i-cat-picker-item ${temp.selectedCategory===c.id?'active':''}" data-id="${c.id}">${escapeHtml(c.name)}</button>`).join('')}
        </div>
      </div>`;
    });
    // custom
    const customs=customPrimaryCategories().filter(c=>c.id!==UNCATEGORIZED_ID);
    if(customs.length){
      customs.forEach(p=>{
        html+=`<div class="i-cat-picker-group">
          <div class="i-cat-picker-title">${renderIcon(p.icon||'📁', p.name)} ${escapeHtml(p.name)}</div>
          <div class="i-cat-picker-children">
            ${customChildren(p.id).map(c=>`<button class="i-cat-picker-item ${temp.selectedCategory===c.id?'active':''}" data-id="${c.id}">${escapeHtml(c.name)}</button>`).join('')}
          </div>
        </div>`;
      });
    }
    container.innerHTML=html;
    $$('.i-cat-picker-item', container).forEach(btn=>{
      btn.addEventListener('click',()=>{
        temp.selectedCategory=btn.dataset.id;
        updateCategoryTrigger();
        closeModal('iCategoryModal');
      });
    });
  }

  function openIconPicker(target){
    // 点击图标仅高亮选中，点「确定」才关闭
    renderIconGrid($('#iIconGrid'), temp.selectedIcon, v=>{
      temp.selectedIcon=v;
      updateIconBtn();
    });
    openModal('iIconModal');
  }
  function renderIconGrid(container, selected, onPick){
    container.innerHTML=DEFAULT_ICONS.map(ic=>`
      <button type="button" class="${ic===selected?'selected':''}" data-icon="${ic}">${ic}</button>
    `).join('');
    $$('button', container).forEach(btn=>{
      btn.addEventListener('click',()=>{
        // 先高亮当前点击的图标，再回调
        $$('button', container).forEach(b=>b.classList.remove('selected'));
        btn.classList.add('selected');
        onPick(btn.dataset.icon);
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
    const pd=$(temp.dateTarget==='#iExpiryDate'?'#iProductionDate':'#iBatchProductionDate').value;
    if(!pd){ showToast('请先设置生产日期'); return; }
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

    // overview
    $('#iEyeBtn')?.addEventListener('click',()=>{ state.settings.hideAmount=!state.settings.hideAmount; save(); renderOverview(); });
    $('#iFilterBtn')?.addEventListener('click', openFilterModal);
    $('#iSortBtn')?.addEventListener('click', openSortModal);
    $('#iGalleryBtn')?.addEventListener('click',()=>{ state.settings.viewMode=state.settings.viewMode==='grid'?'list':'grid'; save(); renderOverview(); });
    $('#iAddItemFab')?.addEventListener('click',()=>openAddItem('single'));
    $('#iExpiringMore')?.addEventListener('click',()=>showSubpage('expiring'));
    $('#iCatBackBtn')?.addEventListener('click',()=>showSubpage('overview'));
    $('#iExpiringBackBtn')?.addEventListener('click',()=>showSubpage('overview'));

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
    $('#iCatSearch')?.addEventListener('input', renderMyCategories);

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
    $('#iIconModalConfirm')?.addEventListener('click',()=>closeModal('iIconModal'));
    $('#iTextModalCancel')?.addEventListener('click',()=>closeModal('iTextModal'));
    $('#iIconTextModalCancel')?.addEventListener('click',()=>closeModal('iIconTextModal'));
    $('#iChildIconRow')?.addEventListener('click', openCatIconPicker);
    $('#iDetailClose')?.addEventListener('click',()=>closeModal('iDetailModal'));
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
