# 独立仓库发布说明

当前状态：本地修改和自动验证完成；新仓库、远程推送及新 Pages 均未完成。GitHub 连接器没有创建仓库的操作，浏览器访问 GitHub 创建页面连接超时。没有因此改动原仓库。

## 目标

- 账号：`lexstark335-ctrl`
- 新仓库名：`NFS-sunset-next`
- 预期仓库地址：`https://github.com/lexstark335-ctrl/NFS-sunset-next`
- 预期试玩地址：`https://lexstark335-ctrl.github.io/NFS-sunset-next/`

上面两项地址只是发布目标，目前不能作为已上线链接。

## 创建与推送

1. 在该账号下创建公开、空的 `NFS-sunset-next` 仓库，不勾选 README、许可证或 `.gitignore`，避免产生不相关的初始提交。若同名仓库已经存在且包含其他工作，先核查，不覆盖或强推。
2. 在本地本目录执行 `git remote -v`，确认 origin 的获取和推送地址均为新仓库，upstream 的推送地址为 `DISABLED-original-repository`。
3. 使用本机正常 GitHub 身份验证后，执行 `git push -u origin main`。不要推送 upstream，不使用 `--mirror` 或 `--force`，不要把个人令牌写入文件、远程 URL 或提交。
4. 在新仓库核对提交历史包含基线 `fc38fa815385b4dbd380bfc564c5ac51b0d4bd50` 及本次新增提交。

## GitHub Pages

仅打开 **NFS-sunset-next** 的 Settings → Pages，选择从分支发布（Deploy from a branch），分支 `main`，目录 `/(root)`。保存后等待构建完成，再访问预期试玩地址。不要操作原仓库的 Pages，也不要设置自定义域名。

这是静态站点，已有 `.nojekyll`，无需构建服务、后台、部署密钥或额外 workflow。复制的原仓库没有 CNAME 或发布工作流，也没有复制凭据。项目子路径使用相对资源 URL，已通过本地 HTTP 和资源解析检查；线上 Pages 仍需单独验证。

发布后分别访问新旧站点，检查新版资源无 404、首页生涯入口、碰撞后返回首页、刷新存档和原站仍可独立访问。浏览器实测清单见 `verification/MANUAL-CHECKS.md`。

## 离线交付

- `NFS-sunset-next.zip`：可运行源码与本地资源；ZIP 不含 `.git`。
- `NFS-sunset-next.bundle`：包含原始及新增提交的完整 Git 历史，可用 `git clone NFS-sunset-next.bundle NFS-sunset-next-restored` 恢复到另一个全新目录。恢复后必须把 origin 从本地 bundle 路径改成新仓库再推送。
- `nfs-sunset-original.bundle`：修改前的完整原仓库历史备份。
- `PLAY.html`：内嵌资源单文件版本，资源闭合测试通过，浏览器运行仍待实测。
