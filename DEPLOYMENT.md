# 独立仓库发布说明

用户已创建独立公开仓库 NFS-sunset-nextV2。本地修改和验证完成，通过 GitHub 连接器提交一次性历史导入工作流，保留原仓库及本地提交。原仓库仅用于读取基线。具体上线结果见该仓库 Actions，未成功部署前预期网址不可作为已上线链接。

## 目标

- 账号：`lexstark335-ctrl`
- 新仓库名：`NFS-sunset-nextV2`
- 预期仓库地址：`https://github.com/lexstark335-ctrl/NFS-sunset-nextV2`
- 预期试玩地址：`https://lexstark335-ctrl.github.io/NFS-sunset-nextV2/`

仓库已经存在；试玩地址需要 Pages 部署成功后才可访问。

## 创建与推送

1. 新仓库已由用户创建。首次导入通过 `.github/workflows/pages.yml` 校验增量 bundle，再读取原基线并构造保留全部历史的合并提交；只快进推送新仓库，不强推。
2. 在本地本目录执行 `git remote -v`，确认 origin 的获取和推送地址均为新仓库，upstream 的推送地址为 `DISABLED-original-repository`。
3. 使用本机正常 GitHub 身份验证后，执行 `git push -u origin main`。不要推送 upstream，不使用 `--mirror` 或 `--force`，不要把个人令牌写入文件、远程 URL 或提交。
4. 在新仓库核对提交历史包含基线 `fc38fa815385b4dbd380bfc564c5ac51b0d4bd50` 及本次新增提交。

## GitHub Pages

仅打开 **NFS-sunset-nextV2** 的 Settings → Pages，将 Source 设为 **GitHub Actions**。随后运行或重试 Import history and publish NFS sunset nextV2 工作流。不要操作原仓库的 Pages，也不要设置自定义域名。

这是静态站点，已有 `.nojekyll`，无需后台或部署密钥。新工作流先运行自动验证，只打包运行资源，再用 GitHub 官方 Pages Actions 发布。导入步骤仅首次执行，使用 GitHub 自带的短期运行令牌，没有复制个人凭据。原仓库没有 CNAME 或发布工作流；新增工作流限定为新仓库执行。项目子路径已通过本地检查，线上 Pages 仍需单独验证。

发布后分别访问新旧站点，检查新版资源无 404、首页生涯入口、碰撞后返回首页、刷新存档和原站仍可独立访问。浏览器实测清单见 `verification/MANUAL-CHECKS.md`。

## 离线交付

- `NFS-sunset-nextV2.zip`：可运行源码与本地资源；ZIP 不含 `.git`。
- `NFS-sunset-nextV2.bundle`：包含原始及新增提交的完整 Git 历史，可用 `git clone NFS-sunset-nextV2.bundle NFS-sunset-nextV2-restored` 恢复到另一个全新目录。恢复后必须把 origin 从本地 bundle 路径改成新仓库再推送。
- `nfs-sunset-original.bundle`：修改前的完整原仓库历史备份。
- `PLAY.html`：内嵌资源单文件版本，资源闭合测试通过，浏览器运行仍待实测。
