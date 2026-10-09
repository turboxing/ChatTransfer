/**
 * 获取用户主目录 / 缓存目录信息
 * @param {*} app
 * @param {*} uploadsDir 当前生效缓存目录
 */
const { getDefaultCachePath, isCustomized, CONFIG_FILE } = require('../config.js');

module.exports = (app, uploadsDir) => {
    app.get('/getHomeDir', async (req, res) => {
        try {
                const response = {
                    code: 0,
                    message: '获取成功',
                    data: {
                        "uploadsDir": uploadsDir,
                        "defaultDir": getDefaultCachePath(),
                        "isCustomized": isCustomized(),
                        "configFile": CONFIG_FILE
                    }
                }
                res.send(response);
        } catch (err) {
            console.log(err);
            res.status(500).send(err);
        }
    });
}
