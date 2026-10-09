/**
 * 打开用户缓存目录
 * @param {*} app 
 * @param {*} homeDir 
 */
module.exports = (app, uploadsDir) => {
    app.post('/openCachePath', async (req, res) => {
        
        
        try {
            let response = {
                code: 0 ,
                message: '打开成功!',
                data: {
                    'platform':process.platform,
                    'path':uploadsDir
                }
            }
            var exec = require('child_process').exec;
            if(process.platform === 'darwin'){
                exec('open ' + uploadsDir, (error, stdout, stderr) => {

                    if (error) {
                        console.error(`exec error: ${error}`);
                        response.code = -1;
                        response.message = '打开失败！' + error.message;
                        
                    }else {
                        console.log(`stdout: ${stdout}`);
                        console.error(`stderr: ${stderr}`);
                        response.code = 0;
                        response.message = '打开成功!';
                    }
                    console.log('response:', response);
                    res.send(response);
                });
            } else if (process.platform === 'win32') {
                exec(`explorer "${uploadsDir}"`, (error, stdout, stderr) => {
                    if (error) {
                        console.error(`exec error: ${error}`);
                        response.code = -1;
                        response.message = '打开失败！' + error.message;
                    } else {
                        response.code = 0;
                        response.message = '打开成功!';
                    }
                    res.send(response);
                });
            } else {
                
                response.code = -1;
                response.message = '暂不支持的平台';
                console.log('response:', response);
                res.send(response);
            }
            

        } catch (err) {
            console.log(err);
            res.status(500).send(err);
        }
    });
}