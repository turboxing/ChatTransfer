const { geneQR } = require("../tool");

/**
 * 获取用户主目录
 * @param {*} app 
 * @param {*} homeDir 
 */
module.exports = (app,chatUrl,AEnterUrl,BEnterUrl) => {
    app.get('/scanLogin', async (req, res) => {
    
       
        try {
                const fromUser =  req.query.sender;
                const receiver = req.query.receiver;
                if (!receiver) {
                    receiver = 'A';
                }
                let targetUrl = `${chatUrl}?sender=${fromUser}&receiver=${receiver}`
                console.log("targetUrl:",targetUrl);
                let response = {
                    code: 0 ,
                    message: '扫码成功!',
                    data: {
                        targetUrl:targetUrl
                    }
                }
                res.send(response);
        } catch (err) {
            console.log(err);
            res.status(500).send(err);
        }
    });
}