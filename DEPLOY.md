# ChatTransfer 官网部署

1. 将 website 文件夹复制到 ChatTransfer 仓库根目录。
2. 将 .github/workflows/deploy-website.yml 放入同名目录，保留已有工作流。
3. GitHub 仓库 Settings → Pages → Source 选择 GitHub Actions。
4. 提交并推送到 main。若先推送再开启 Pages，可在 Actions 手动运行 Deploy ChatTransfer website。
5. 工作流成功后访问 https://turboxing.github.io/ChatTransfer/ 。

文件已适配 /ChatTransfer/ 路径，并替换 canonical、结构化数据、分享图片与站点地图 URL。
llms.txt、llm.txt 使用无 BOM 的 UTF-8 文本，并保持一致。页面通过 alternate 链接声明 llms.txt，便于支持该约定的 AI 抓取工具发现产品事实索引。
robots.txt 位于项目子路径，搜索引擎通常只读取域名根目录 /robots.txt；不依赖此文件控制整个 github.io 域名。可直接在 Google Search Console 和 Bing Webmaster Tools 提交 https://turboxing.github.io/ChatTransfer/sitemap.xml。如需真正生效的根级 robots.txt、更完整的多语言 SEO 与稳定分享链接，建议后续绑定自定义域名。
GitHub Pages 只承载宣传网站，在线体验仍链接现有远程服务。
