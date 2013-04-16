/**
 * controller - topic.
 * User: raytin
 * Date: 13-3-28
 */
var proxy = require('../proxy'),
    util = require('../util'),
    topicModel = require('../models').Topic,
    userModel = require('../models').User,
    topicProxy = proxy.Topic,
    userProxy = proxy.User,
    EventProxy = require("eventproxy");

// 发表话题（异步）
function newTopic(req, res, next){
    if( !util.checkUserStatusAsync(res, '先登录啊亲 (╯_╰)') ) return;

    //var session = req.session;
    var currentUser = res.locals.current_user,
        content = req.body['content'],
        desc;

    if(content == ''){
        desc = '话题内容不能为空。';
        res.json({
            success: false,
            data: desc
        })
        return;
    };

    var ep = new EventProxy(),
        newTopic = new topicModel();

    newTopic.content = content;
    newTopic.author_name = currentUser;
    newTopic.create_time = new Date().format('yyyy/MM/dd hh:mm:ss');

    ep.all('getUserId', function(user){
        newTopic.create_time = new Date(newTopic.create_time).format('MM月dd日 hh:mm');
        user.topic_count += 1;
        user.save();
        res.json({
            success: true,
            data: {
                topic: newTopic,
                user: user
            }
        });
    }).fail(next);

    userProxy.getOneUserInfo({name: currentUser}, '_id name nickName head topic_count', ep.done(function(user){
        newTopic.author_id = user._id;
        newTopic.save(ep.done(function(){
            ep.emit('getUserId', user);
        }));
    }));
};

// 话题广场首页
function index(req, res, next){
    // 查询话题信息
    topicProxy.getTopicList(function(err, topics){
        if(err) return next(err);
        if(topics && topics.length != 0){
            console.log(topics);
            res.render('topic/index', {
                title: '话题广场',
                topics: topics
            });
        }
        // 无话题
        else{
            res.render('topic/index', {
                title: '话题广场',
                topics: null
            });
        };
    });
};

// 发表话题
function addTopic(req, res, next){
    //var session = req.session;
    var currentUser = res.locals.current_user,
        content = req.body['content'],
        desc;

    if(!currentUser || content == ''){
        desc = !currentUser ? '请先登录，才能发表话题。' : '话题内容不能为空。';
        res.render('notice/normal', {
            title: '出错了',
            desc: desc,
            layout: null
        })
        return;
    };

    var ep = new EventProxy(),
        newTopic = new topicModel();

    newTopic.content = content;
    newTopic.author_name = currentUser;
    newTopic.create_time = new Date().format('yyyy/MM/dd hh:mm:ss');

    ep.all('getUserId', function(user){
        user.topic_count += 1;
        user.save();
        res.redirect('/');
    }).fail(next);

    userProxy.getOneUserInfo({name: currentUser}, '_id topic_count', ep.done(function(user){
        newTopic.author_id = user._id;
        newTopic.save();
        ep.emit('getUserId', user);
    }));
};

module.exports = {
    //addTopic: addTopic,
    //index: index,
    newTopic: newTopic
};