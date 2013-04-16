/**
 * controller - home.
 * User: raytin
 * Date: 13-3-27
 * Time: 上午10:56
 */
var proxy = require("../proxy"),
    common = proxy.common,
    userProxy = proxy.User,
    topicProxy = proxy.Topic,
    config = require('../config').config,
    EventProxy = require("eventproxy");

var fs = require('fs');
var crypto = require('crypto');

exports.index = function(req, res, next){
    /*console.log(req.user); //无效
    //console.log(req.params);
    //console.log(req.body);
    //var ab = 8;
    //req.flash('info', 'you have %s items in yours', ab);
    //req.session.info = 'ubssss';
    //req.session.handa = 'dddyyy';
    //var info = req.flash( 'info');
    //console.log(info);
    //req.session.handa = null;
    fs.readdir('./public/csss', function(err, files){
        if(err) return console.log(999999999999999);
        console.log(files);
    });
    var user = null;
    if(req.session && req.session.user ){
        user = req.session.user;
    }
    console.log(res.locals);
    res.locals.user = user;
    res.locals.testfun = function(str){
        return '['+str+']';
    };
     console.log(req.query);
    */
    var cipher = crypto.createCipher('aes-256-cbc', config.key);
    console.log(cipher);
    var cryptoed = cipher.update('xiao1989jie0106abcdefg', 'binary', 'hex');
    console.log( cryptoed );
    var miied = cryptoed + cipher.final('hex');
    console.log( miied );
    var decipher = crypto.createDecipher('aes-256-cbc', config.key);
    console.log(decipher);
    var deciphered = decipher.update(miied, 'hex', 'utf8');
    console.log(deciphered);
    console.log( decipher.final('utf8') )


    /*console.log(cipher);
    console.log( cipher.update('lucassdddddddddsfsdafasfadsfdasf', 'binary', 'hex') );
    //console.log( cipher.update('hankas', 'binary', 'hex') );
    console.log( cipher.final('hex') );*/

    console.log(req.session);
    var ep = new EventProxy(),
        page = req.query.page || 1,
        limit = config.limit,
        opt = {skip: (page - 1) * limit, limit: limit, sort: [['_id', 'desc']]};

    //ep.all('userList', 'topicList', 'current_user', 'userListByCount', function(userList, topicList, current_user, userListByCount){
    ep.all( 'topicList', 'sidebar', 'topbar', 'totalCount', function(topicList, sidebar, topbar, totalCount){
        res.render('index',
            {
                title: config.name,
                config: config,
                topics: topicList,
                topInfo: topbar.topInfo,
                users: sidebar.users,
                userInfo: sidebar.userInfo,
                usersByCount: sidebar.usersByCount,
                totalCount: totalCount,
                page: parseInt(page)
            }
        );
    });
    ep.fail(next);

    topicProxy.getTopicList('', opt, ep.done(function(topicList){
        var topicLen = topicList.length;

        // 如果用户设置了昵称，则优先显示昵称
        // 将昵称与头像附加到主题对象
        ep.after('toAll', topicLen, function(){
            ep.emit('topicList', topicList);
        });

        // 获取当前主题的作者昵称与头像
        topicList.forEach(function(cur, i){
            userProxy.getOneUserInfo({_id : cur.author_id}, 'name nickName head', ep.done(function(user){
                var nickName = user.nickName, time = cur.create_time;

                cur.author_nickName = nickName ? nickName : user.name;
                cur.head = user.head ? user.head : config.nopic;
                cur.create_time = new Date(time).format('MM月dd日 hh:mm');

                ep.emit('toAll');
            }));
        });
    }));

    // 获取右侧资源
    common.getSidebarNeed(res, next, {fields: 'name nickName head fans followed topic_count sign lastLogin_time'}, function(need){
        ep.emit('sidebar', need);
    });

    // 获取顶部资源
    common.getTopbarNeed(res, next, function(need){
        ep.emit('topbar', need);
    });

    // 取得总页数
    topicProxy.getTopicCount(ep.done(function(totalCount){
        ep.emit('totalCount', Math.ceil(totalCount / limit));
    }));

};

// 以下代码仅为测试之用
exports.test = function(req, res, next){
    res.render('test', {
        title: 'test'
    });
};

exports.ajaxTest = function(req, res, next){
    userProxy.getUserList(function(err, users){
        if(err) return next(err);
        if(users && users.length){
            res.json(users)
        }
    });
};