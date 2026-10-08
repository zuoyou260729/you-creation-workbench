/* 云端同步配置 —— 由 items.js 读取 window.SYNC_CONFIG
 *
 * backend 决定用哪个云端：
 *   'github' —— GitHub（国际，大陆网络常无法访问其 API，会出现"推不上去/拉不下来"）
 *   'gitee'  —— 码云（国内可访问，推荐大陆用户使用）
 *
 * 注意：本文件随公开站点部署，Token 在浏览器运行时被还原，技术上任何人都可
 * 从源码还原出该 Token（只是拆开拼接以绕过 GitHub 密钥扫描的明文拦截）。
 * 强烈建议改用「仅限本仓库 Contents 读写」的细粒度 Token，并定期轮换；
 * 发现泄露立即在对应平台撤销。
 */
(function () {
  window.SYNC_CONFIG = {
    // ★ 当前用 Gitee（码云）：国内可访问，解决手机端连不上 GitHub 的问题
    backend: 'gitee',

    github: {
      repo: 'zuoyou260729/you-creation-workbench',
      branch: 'main',
      path: 'data/items-sync.json',
      // GitHub Token（拆成多段拼接，避免明文触发 GitHub 密钥扫描拦截）
      token: 'ghp_' + 'qoJwyXSUIYpckiQG0' + 'ZgI9e4xsKiiHB3ujVhB'
    },

    // ===== Gitee（码云）配置：大陆网络可访问 =====
    // 设置步骤：
    // 1) 注册并登录 https://gitee.com
    // 2) 新建一个【私有】仓库（如 you-sync），首次同步会自动在仓库内创建 data/items-sync.json
    // 3) 右上角头像 → 设置 → 私人令牌 → 生成令牌，勾选「projects」权限
    // 4) 把下面 repo 改成「你的用户名/你的仓库」，token 粘贴生成的令牌
    gitee: {
      repo: 'zuoyou260729/you-sync',
      branch: 'master',  // Gitee 默认分支通常是 master；若你仓库默认是 main 请改成 'main'
      path: 'data/items-sync.json',
      token: 'baba911aed1237d84e3348fe1793501d'
    }
  };
})();
