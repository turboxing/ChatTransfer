
/**
 * 检查登录状态
 * @param {*} app 
 * @param {*}  
 */
module.exports = (app) => {
    app.get('/checkLogin', async (req, res) => {
       
        try {
                let response = {
                    code: 0 ,
                    message: '检查成功!',
                    data: {
                        users:global.users
                    }
                }
                res.send(response);
        } catch (err) {
            console.log(err);
            res.status(500).send(err);
        }
    });
}