const { geneQR } = require("../tool");


/**
 * 获取首页信息
 * @param {*} app 
 * @param {*} AEnterUrl 
 * @param {*} BEnterUrl 
 */
module.exports = (app,homeUrl, AEnterUrl,BEnterUrl) => {

    app.get('/getIndexInfo2', async (req, res) => {

        try {
            // http://192.168.1.4:50001/login?receiver=A
            
            const receiver = req.query.receiver;
            // 指向 Vue 路由 /login，而不是旧的 html 文件
            let loginUrl = `${homeUrl}/login?receiver=${receiver}`;
            const qrABase64Str = geneQR(loginUrl);
            
            const response = {
                code: 0,
                message: '获取成功',
                data: {
                    "title": "",
                    "lists": [
                        {
                            "qrurl":qrABase64Str,
                            "jupmUrl":loginUrl
                        }
                    ]
                }
            }
            res.send(response);

        } catch (err) {
            console.log(err);
            res.status(500).send(err);
        }
    });
}