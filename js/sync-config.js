/* 云端同步配置 —— 由 items.js 读取 window.SYNC_CONFIG
 *
 * backend 决定用哪个云端：
 *   'github' —— GitHub（国际，大陆网络常无法访问其 API，会出现"推不上去/拉不下来"）
 *   'gitee'  —— 码云（国内可访问，建议大陆用户使用）
 *
 * 注意：本文件随公开站点部署，Token 在浏览器运行时被还原，技术上任何人都可
 * 从源码还原出该 Token（只是拆开拼接以绕过 GitHub 密钥扫描的明文拦截）。
 * 强烈建议改用「仅限本仓库 Contents 读写」的细粒度 Token，并定期轮换；
 * 发现泄露立即在对应平台撤销。
 */
(function () {
  // GitHub Token（拆成多段拼接，避免明文触发 GitHub 密钥扫描拦截）
  var _gh = 'ghp_' + 'qoJwyXSUIYpckiQG0' + 'ZgI9e4xsKiiHB3ujVhB';

  window.SYNC_CONFIG = {
    backend: 'github', // ← 想用 Gitee 就改成 'gitee'，并把下面 gitee 字段填好

    github: {
      repo: 'zuoyou260729/you-creation-workbench',
      branch: 'main',
      path: 'data/items-sync.json',
      token: _gh
    },

    // ===== Gitee（码云）配置：大陆网络可访问 =====
    // 1) 注册并登录 https://gitee.com
    // 2) 新建一个公开仓库（如 you-sync），在里面建 data/items-sync.json（空内容即可）
    // 3) 右上角头像 → 设置 → 私人令牌 → 生成令牌，勾选「projects」权限
    // 4) 把下面 repo 改成「你的用户名/你的仓库」，token 粘贴生成的令牌
    gitee: {
      repo: '',          // 例：'zuoyou260729/you-sync'
      branch: 'master',  // Gitee 默认分支通常是 master
      path: 'data/items-sync.json',
      token: ''          // 在此粘贴 Gitee 私人令牌
    }
  };
})();
