/**
 * controller - user.
 * User: raytin
 * Date: 13-3-27
 */
var proxy = require('../proxy'),
    common = proxy.common,
    userProxy = proxy.User,
    topicProxy = proxy.Topic,
    config = require('../config').config,
    EventProxy = require('eventproxy'),
    fs = require('fs'),
    util = require('../util');

// 个人资料
function accountPage(req, res, next, settings){
    if( !util.checkUserStatus(res, '请先登录。') ) return;

    var ep = new EventProxy();

    ep.all('sidebar', 'topbar', function(sidebar, topbar){
        res.render(settings.page,
            {
                title: settings.title,
                config: config,
                topInfo: topbar.topInfo,
                users: sidebar.users,
                userInfo: sidebar.userInfo,
                usersByCount: sidebar.usersByCount
            }
        );
    });
    ep.fail(next);

    // 获取右侧资源
    common.getSidebarNeed(res, next, settings.fields, function(need){
        ep.emit('sidebar', need);
    });

    // 获取顶部资源
    common.getTopbarNeed(res, next, function(need){
        ep.emit('topbar', need);
    });
};
function account(req, res, next){
    accountPage(req, res, next, {page: 'user/account', title: '资料设置', fields: 'name nickName head follower followed topic_count sign lastLogin_time email'});
};

// 保存资料
function account_save(req, res, next){
    if( !util.checkUserStatusAsync(res, '先登录啊亲 (╯_╰)') ) return;

    var username = res.locals.current_user,
        ep = new EventProxy();

    // 删除时间戳
    delete req.body.random;

    ep.all('updateUserInfo', 'getUserInfo', function(update, user){
        res.json({
            success: true,
            data: user
        });
    }).fail(next);

    userProxy.updateUserInfoByName(username, req.body, ep.done('updateUserInfo'));
    userProxy.getUserInfoByName(username, 'sign nickName', ep.done('getUserInfo'));

};

//修改密码
function pass(req, res, next){
    accountPage(req, res, next, {page: 'user/pass', title: '修改密码', fields: 'name nickName head follower followed topic_count sign lastLogin_time email'});
};
function pass_save(req, res, next){
    if( !util.checkUserStatusAsync(res, '先登录啊亲 (╯_╰)') ) return;

    var username = res.locals.current_user,
        ep = new EventProxy();

    ep.fail(next);

    userProxy.getUserInfoByName(username, 'pass', ep.done(function(user){
        var param = {
            success: true,
            data: 'ok'
        };
        if(req.body.pass !== user.pass){
            param.data = 'no';
            res.json(param);
        }else{
            userProxy.updateUserInfoByName(username, {pass: req.body.newPass}, ep.done(function(){
                res.json(param);
            }));
        }
    }));

};

//上传头像
function avatar(req, res, next){
    accountPage(req, res, next, {page: 'user/avatar', title: '上传头像', fields: 'name nickName head follower followed topic_count sign head lastLogin_time email'});
};
function avatar_save(req, res, next){
    if( !util.checkUserStatus(res, '先登录啊亲 (╯_╰)') ) return;
    var user = res.locals.current_user,
        pic = req.files.headPic,
        mat = pic.type.match(/(gif|jpeg|png)/g),
        tmp = pic.path,
        suffix,
        target = config.uploadDir + 'userHeadPic_' + user + '.',
        ep = new EventProxy();

    ep.all('re', function(action){
        console.log('file: '+tmp+' uploaded to: '+target+' ,size: '+req.files.headPic.length);
        res.render('notice/action', {
            action: {
                success: action.success,
                data: action.data,
                img: action.img
            },
            layout: null
        })
    }).fail(next);

    // 检查文件的大小和格式
    if(!mat){
        msg = '（︶︿︶） 图片格式不对吧亲~';
        ep.emit('re', {success: false, data: msg});
        return;
    }else if(pic.length > 204800){
        msg = '（︶︿︶） 图片太大了，服务器表示鸭梨好大';
        ep.emit('re', {success: false, data: msg});
        return;
    }
    suffix = mat[0] === 'jpeg' ? 'jpg' : mat[0] === 'gif' ? 'gif' : 'png';

    fs.rename(tmp, target += suffix, ep.done(function(){
        userProxy.updateUserInfoByName(user, {head: target = target.replace('./public', '')}, ep.done(function(){
            ep.emit('re', {
                success: true,
                data: '<(￣︶￣)> 已成功上传真像。',
                img: target
            });
        }))
    }));
};

// 我的吐槽
function myTopic(req, res, next){
    if( !util.checkUserStatus(res, '先登录啊亲 (╯_╰)') ) return;

    var current_user = res.locals.current_user,
        ep = new EventProxy(),
        page = req.query.page || 1,
        limit = config.limit,
        opt = {skip: (page - 1) * limit, limit: limit, sort: [['_id', 'desc']]};

    ep.all('topicList', 'sidebar', 'topbar', 'totalCount', function(topicList, sidebar, topbar, totalCount){
        res.render('user/myTopic', {
            title: config.name,
            config: config,
            topics: topicList,
            topInfo: topbar.topInfo,
            users: sidebar.users,
            userInfo: sidebar.userInfo,
            usersByCount: sidebar.usersByCount,
            totalCount: totalCount,
            page: parseInt(page)
        });
    }).fail(next);

    // 取得用户吐槽列表
    topicProxy.getTopicList({author_name: current_user}, opt, ep.done(function(topicList){
        // 获取当前主题的作者昵称与头像
        ep.after('toAll', topicList.length, function(){
            ep.emit('topicList', topicList);
        });

        topicList.forEach(function(cur, i){
            userProxy.getOneUserInfo({_id : cur.author_id}, 'nickName head', ep.done(function(user){
                var nickName = user.nickName;

                cur.author_nickName = nickName ? nickName : user.name;
                cur.head = user.head ? user.head : config.nopic;

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
    topicProxy.getTopicCount({author_name: current_user}, ep.done(function(totalCount){
        ep.emit('totalCount', Math.ceil(totalCount / limit));
    }));
};

// 用户中心
function user_center(req, res, next){
    var userName = req.params.name,
        current_user = res.locals.current_user,
        followIn = false;

    var ep = new EventProxy(),
        page = req.query.page || 1,
        limit = config.limit,
        opt = {skip: (page - 1) * limit, limit: limit, sort: [['_id', 'desc']]};

    ep.all('topicList', 'sidebar', 'topbar', 'totalCount', function(topicList, sidebar, topbar, totalCount){
        res.locals.location = 'usercenter';
        res.render('user/usercenter', {
            title: config.name,
            config: config,
            topics: topicList,
            topInfo: topbar.topInfo,
            users: sidebar.users,
            userInfo: sidebar.userInfo,
            usersByCount: sidebar.usersByCount,
            followIn: followIn,
            totalCount: totalCount,
            page: parseInt(page)
        });
    }).fail(next);

    // 验证用户是否存在
    userProxy.getUserInfoByName(userName, 'name nickName head fans', ep.done(function(user){
        if(user){
            // 检查登录用户是否当前用户的粉丝
            if(current_user && user.fans.length){
                if( user.fans.contains(current_user)){
                    followIn = true;
                }
            }
            // 取得用户吐槽列表
            topicProxy.getTopicList({author_name: userName}, opt, ep.done(function(topicList){
                // 如果用户设置了昵称，则优先显示昵称
                var nickName = user.nickName;

                topicList.forEach(function(cur, i){
                    cur.author_nickName = nickName;
                    cur.head = user.head;
                });

                ep.emit('topicList', topicList);
            }));

            // 获取右侧资源
            common.getSidebarNeed(res, next, {current_user: userName, fields: 'name nickName head fans followed topic_count sign lastLogin_time'}, function(need){
                ep.emit('sidebar', need);
            });
        }else{
            res.render('notice/normal', {
                title: '用户名不存在',
                desc: userName + ' 介个用户不存在啊亲 (╯_╰) 检查检查~',
                layout: null
            });
        }
    }));

    // 获取顶部资源
    common.getTopbarNeed(res, next, function(need){
        ep.emit('topbar', need);
    });

    // 取得总页数
    topicProxy.getTopicCount({author_name: userName}, ep.done(function(totalCount){
        ep.emit('totalCount', Math.ceil(totalCount / limit));
    }));
};

// 关注
function follow(req, res, next){
    if( !util.checkUserStatusAsync(res, '先登录啊亲 (╯_╰)') ) return;
    var current_user = res.locals.current_user,
        status = req.body.follow == 'true',
        target = req.body.user,
        ep = new EventProxy(),
        msgBody;

    //console.log(status);return;
    ep.all('target', 'follow', function(fans){
        res.json({
            success: true,
            data: fans
        });
    }).fail(next);

    // 更新用户数据
    userProxy.getUserListBy({name: {$in: [target, current_user]}}, 'name nickName fans followed message newMessage', ep.done(function(user){
        var curUser = user[0],
            tarUser = user[1];

        // 检查校正返回用户顺序
        if(curUser.name != current_user){
            curUser = user[1];
            tarUser = user[0];
        }

        // 更新目标用户粉丝
        tarUser.fans[status ? 'push' : 'remove'](current_user);

        // 更新目标用户消息
        msgBody = {
            msgType: status ? 'fansIn' : 'fansOut',
            time: new Date().format('MM月dd日 hh:mm'),
            name: current_user,
            nickName: curUser.nickName ? curUser.nickName : current_user,
            readed: false
        };
        tarUser.message.push(msgBody);
        tarUser.newMessage += 1;
        tarUser.save(ep.done(function(){
            ep.emit('target', tarUser.fans);
        }));

        // 更新当前用户关注列表
        curUser.followed[status ? 'push' : 'remove'](target);
        curUser.save(ep.done(function(){
            ep.emit('follow');
        }));
    }));
};

// 消息中心
function message(req, res, next){
    if( !util.checkUserStatusAsync(res, '先登录啊亲 (╯_╰)') ) return;

    var current_user = res.locals.current_user,
        ep = new EventProxy();

    ep.all('sidebar', 'topbar', 'message', function(sidebar, topbar, current_user){
        var message = current_user.message;

        if(!message || !message.length){
            message = null;
        };

        res.render('user/message', {
            title: '消息中心 | ' + config.name,
            config: config,
            topInfo: topbar.topInfo,
            users: sidebar.users,
            userInfo: sidebar.userInfo,
            usersByCount: sidebar.usersByCount,
            message: message
        });


    }).fail(next);

    // 获取右侧资源
    common.getSidebarNeed(res, next, {fields: 'name nickName head fans followed topic_count sign lastLogin_time'}, function(need){
        ep.emit('sidebar', need);
    });

    // 获取顶部资源
    common.getTopbarNeed(res, next, function(need){
        ep.emit('topbar', need);
    });

    // 获取消息
    userProxy.getUserInfoByName(current_user, 'message newMessage', ep.done(function(user){
        var message = user.message, clone = JSON.parse(JSON.stringify(user));

        // 加上用户已读标记
        user.newMessage = 0;
        message.forEach(function(item){
            item.readed = true;
        });
        user.markModified('message');

        // 超过20条消息则删除旧的10条
        if(message.length > 20){
            message.splice(0, 10);
        };

        user.save(ep.done(function(){
            ep.emit('message', clone );
        }));
    }));
};
// 清空消息中心
function message_empty(req, res, next){
    if( !util.checkUserStatusAsync(res, '先登录啊亲 (╯_╰)') ) return;

    var current_user = res.locals.current_user,
        ep = new EventProxy();

    ep.fail(next);

    userProxy.getUserInfoByName(current_user, 'message', ep.done(function(user){
        user.message = [];
        user.save(ep.done(function(){
            res.json({
                success: true
            });
        }));
    }));
};

function list(req, res, next){
    userProxy.getUserList(function(err, users){
        console.log(users);
        if(err){
            return next(err);
        };
        if(users){
            res.render('userList', {
                title: '用户列表',
                userNames: users
            });
            return;
        }else{
            res.render('userList', {
                title: '用户列表',
                userNames: null
            });
        };
    });
};

module.exports = {
    account: account,
    account_save: account_save,
    pass: pass,
    pass_save: pass_save,
    avatar: avatar,
    avatar_save: avatar_save,
    myTopic: myTopic,
    user_center: user_center,
    follow: follow,
    message: message,
    message_empty: message_empty,
    list: list
};