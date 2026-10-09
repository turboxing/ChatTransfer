/**
 * 设置自定义缓存目录
 * 请求体: { path: string, migrate?: boolean }
 * 生效方式: 修改后需重启进程(express.static / fileUpload 中间件运行时不可热切换)
 * @param {*} app
 * @param {*} uploadsDir 当前生效缓存目录
 */
const fs = require('fs');
const path = require('path');
const express = require('express');
const { setCachePath } = require('../config.js');
const { getAppWritableRoot } = require('../tool.js');

module.exports = (app, uploadsDir) => {
    app.post('/setCachePath', express.json(), async (req, res) => {
        try {
            const inputPath = req.body && req.body.path;
            const migrate = req.body ? req.body.migrate !== false : true;

            // 1. 参数校验
            if (!inputPath || typeof inputPath !== 'string' || !inputPath.trim()) {
                return res.send({ code: -1, message: '请输入缓存目录路径' });
            }

            // 2. 必须绝对路径(先校验原始输入,再 resolve 规范化)
            const trimmed = inputPath.trim();
            if (!path.isAbsolute(trimmed)) {
                return res.send({ code: -1, message: '请输入绝对路径' });
            }
            const newPath = path.resolve(trimmed);

            // 3. 不能等于当前路径
            if (newPath === path.resolve(uploadsDir)) {
                return res.send({ code: -1, message: '新路径与当前路径相同' });
            }

            // 4. 不能等于应用根目录(避免污染应用文件)
            const appRoot = getAppWritableRoot();
            if (newPath === path.resolve(appRoot)) {
                return res.send({ code: -1, message: '不能使用应用根目录作为缓存目录' });
            }

            // 5. 目录不存在则创建
            try {
                if (!fs.existsSync(newPath)) {
                    fs.mkdirSync(newPath, { recursive: true });
                }
            } catch (e) {
                return res.send({ code: -1, message: '目录创建失败:' + e.message });
            }

            // 6. 可写性测试:写临时文件再删
            const testFile = path.join(newPath, '.chattransfer-write-test');
            try {
                fs.writeFileSync(testFile, 'ok', 'utf8');
                fs.unlinkSync(testFile);
            } catch (e) {
                return res.send({ code: -1, message: '路径无效或不可写' });
            }

            // 7. 迁移已有文件(递归复制旧目录内容到新目录)
            if (migrate && fs.existsSync(uploadsDir)) {
                try {
                    fs.cpSync(uploadsDir, newPath, { recursive: true });
                    // 清理测试遗留(若有)
                    if (fs.existsSync(testFile)) fs.unlinkSync(testFile);
                } catch (e) {
                    // 迁移失败:清理已复制的内容,回滚,不更新配置
                    console.error('[setCachePath] migrate failed:', e.message);
                    return res.send({ code: -1, message: '迁移文件失败:' + e.message });
                }
            }

            // 8. 持久化到 config.json
            try {
                setCachePath(newPath);
            } catch (e) {
                return res.send({ code: -1, message: '配置保存失败:' + e.message });
            }

            res.send({
                code: 0,
                message: '缓存目录设置成功,重启应用后生效',
                data: {
                    newPath: newPath,
                    needsRestart: true
                }
            });
        } catch (err) {
            console.log(err);
            res.status(500).send({ code: -1, message: err.message || '服务器内部错误' });
        }
    });
}
