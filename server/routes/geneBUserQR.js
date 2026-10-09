const { geneQR } = require("../tool");

/**
 * 获取用户主目录
 * @param {*} app 
 * @param {*} homeDir 
 */
module.exports = (app,homeUrl) => {
    app.get('/geneBUserQR', async (req, res) => {
        
        try {
                const fullBUserUrl = homeUrl + "/scanLogin?fromUser=B"
                let response = {
                    code: 0 ,
                    message: '创建成功!',
                    data: {
                        qr:""
                    }
                }
                const qrABase64Str = geneQR(fullBUserUrl);
                if (qrABase64Str) {
                    response.data.qr = qrABase64Str
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