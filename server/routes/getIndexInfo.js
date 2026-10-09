const { geneQR } = require("../tool");


/**
 * 获取首页信息
 * @param {*} app 
 * @param {*} AEnterUrl 
 * @param {*} BEnterUrl 
 */
module.exports = (app, AEnterUrl,BEnterUrl) => {

    app.get('/getIndexInfo', async (req, res) => {

        try {

            const qrABase64Str = geneQR(AEnterUrl);
            const qrBBase64Str = geneQR(BEnterUrl);
            const response = {
                code: 0,
                message: '获取成功',
                data: {
                    "title": "",
                    "lists": [
                        {
                            "qrurl":qrABase64Str,
                            "jupmUrl":AEnterUrl
                        },
                        {
                            "qrurl": qrBBase64Str,
                            "jupmUrl":BEnterUrl 
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