const os = require('os');
const path = require('path');
var qr = require('qr-image');
module.exports.getIPAddress = function () {
  var interfaces = os.networkInterfaces();
  for (var devName in interfaces) {
    var iface = interfaces[devName];
    for (var i = 0; i < iface.length; i++) {
      var alias = iface[i];
      if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal) {
        return alias.address;
      }
    }
  }
}

//打开默认浏览器
module.exports.openDefaultBrowser = function (url) {
  console.log("使用浏览器打开首页");
  var exec = require('child_process').exec;
  switch (process.platform) {
    case "darwin":
      exec('open ' + url);
      break;
    case "win32":
      exec('start ' + url);
      break;
    default:
      exec('xdg-open', [url]);
  }
}

module.exports.getAppWritableRoot = function () {
  if (process.pkg) {
    // Pkg环境：使用可执行文件所在目录（可写）
    console.log('Running in pkg environment');
    return path.dirname(process.execPath);
  } else {
    // 开发环境：使用项目根目录（server目录的上级）
    console.log('Running in development environment');
    return path.join(__dirname, '..');
  }
}
module.exports.initCachePath = function (cachePath,callback) {
  console.log('开始初始化缓存目录');

  // 如果不存在则创建，都则不创建
  let fs = require('fs');
  if(fs.existsSync(cachePath)){
    console.log('缓存目录已存在，无需创建');
    callback();
    return;
  };
  fs.mkdir(cachePath, (err) => {
    if (err) {
      console.log('出错:',err)
    } else {
      console.log("初始化缓存目录成功")
    }
    callback(err);
  })

}

module.exports.homeDir = os.userInfo().homedir;
module.exports.geneQR = function(url){
  var img_string = qr.imageSync(url, { type: 'png' ,size:10});
  const base64Str = 'data:image/png;base64,' + Buffer.from(img_string, 'utf8').toString('base64')
  return base64Str;
}

