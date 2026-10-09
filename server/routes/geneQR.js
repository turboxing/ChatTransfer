const { geneQR } = require("../tool");

/**
 * 获取用户主目录
 * @param {*} app 
 * @param {*} homeDir 
 */
module.exports = (app) => {
    app.get('/geneQR', async (req, res) => {
        
        try {
            const qrContent = req.query.qrStr;
                let response = {
                    code: 0 ,
                    message: '创建成功!',
                    data: {
                        qr:"",
                        qrText:""
                    }
                }
                const qrABase64Str = geneQR(qrContent);
                if (qrABase64Str) {
                    response.data.qr = qrABase64Str;
                    response.data.qrText = qrContent;
                }else {
                    response.data = {};
                    response.code = -1;
                    response.message = "生成二维码失败";
                } 
             
                console.log('response:',response);
                res.send(response);
            
        } catch (err) {
            console.log(err);
            res.status(500).send(err);
        }
    });
}