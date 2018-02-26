const fs = require('fs');
const jsonfile = require('jsonfile');
const unirest = require('unirest');
const TTypes = require('../thrift/line_types');
const path = require('path');

var config = require('./config');
var thrift = require('thrift-http');

module.exports = {
    /* Usefull thing */

    echo: function(val) {
        return val;
    },

    isFunction: function(functionToCheck) {
        return functionToCheck && {}.toString.call(functionToCheck) === '[object Function]';
    },

    saveRevision: function(xrevision) {
        let xcont = {
            "revision": xrevision
        };
        fs.writeFile("./data/revision.json", JSON.stringify(xcont), function(err) {
            //if(err) {callback(err)}else{callback("DONE")}
        });
    },

    saveJSON: function(paths, data, callback) {
        jsonfile.writeFile(paths, data, function(err) {
            if (err) {
                return console.log(err);
            }

            callback("DONE");
        });
    },

    saveSquareRev: function(sqChatMid = '', syncToken, continuationToken) {
        let xdata = {
            syncToken: syncToken,
            continuationToken: continuationToken
        }
        jsonfile.writeFile('./data/square-' + sqChatMid + '.json', xdata, function(err) {
            if (err) {
                return console.log(err);
            }
        });
    },

    restoreSquareRev: function(callback, sqChatMid = '') {
        if (fs.existsSync('./data/square-' + sqChatMid + '.json')) {
            fs.readFile('./data/square-' + sqChatMid + '.json', (err, data) => {
                if (err) throw err;
                //xstor = JSON.parse(data);
                callback(JSON.parse(data));
            })
        } else {
            callback('error');
        }
    },

    storedJSON: function(paths, callback) {
        let xstor;
        if (fs.existsSync(path.resolve(paths))) {
            fs.readFile(path.resolve(paths), (err, data) => {
                if (err) throw err;
                //xstor = JSON.parse(data);
                callback(data);
            });
        } else {
            xstor = {
                error: "NO_FILE"
            };
            callback('NOTFOUND');
        }
    },

    checkUpdate: function() {
        unirest.get(config.raw_repo + 'version.txt').end(function(data) {
            if (config.version < parseFloat(data.body) || config.version != parseFloat(data.body)) {
                console.info('There are new version of LINE SquareBot \n-> ' + config.repo + ' (' + parseFloat(data.body) + ')')
            } else {
                console.info('You are currently using the latest version ! ^_^')
            }
        })
    },

    ambilKata: function(params, kata1, kata2) {
        if (params.indexOf(kata1) === false) return false;
        if (params.indexOf(kata2) === false) return false;
        let start = params.indexOf(kata1) + kata1.length;
        let end = params.indexOf(kata2, start);
        let returns = params.substr(start, end - start);
        return returns;
    },

    getJson: function(path, xconfig) {
        unirest.get(path).headers(xconfig.Headers).timeout(120000)
            .end((res) => {
                console.info(res.body)
                return res.body;
            })
    },

    /* Auth */

    getRSAKeyInfo: function(provider, xthrift, callback) {
        xthrift.getRSAKeyInfo(provider, (err, success) => {
            callback(success.keynm, success);
        });
    },

    loginWithVerifier: function(xthrift, xconfig, callback) {
        let reqx = new TTypes.LoginRequest();
        console.info(config.Headers);
        unirest.get('https://' + config.LINE_DOMAIN + config.LINE_CERTIFICATE_URL).headers(config.headers).timeout(120000)
            .end((res) => {
                reqx.type = 1;
                reqx.verifier = res.body.result.verifier;
                xthrift.loginZ(reqx, (err, success) => {
                    callback(success);
                })
            })
    },

    setProvider: function(id, xconfig, callback) {
        let provider = config.EMAIL_REGEX.test(id) ?
            TTypes.IdentityProvider.LINE :
            TTypes.IdentityProvider.NAVER_KR;

        callback(provider === TTypes.IdentityProvider.LINE ?
            module.exports.getJson(config.LINE_SESSION_LINE_URL, xconfig) :
            module.exports.getJson(config.LINE_SESSION_NAVER_URL, xconfig))
    },

    checkLoginResultType: function(type, result) {
        let certificate, authToken;
        config.Headers['X-Line-Access'] = result.authToken || result.verifier;
        if (result.type === TTypes.LoginResultType.SUCCESS) {
            console.log('> Login success');
        } else if (result.type === TTypes.LoginResultType.REQUIRE_QRCODE) {
            console.log('> require QR code');
        } else if (result.type === TTypes.LoginResultType.REQUIRE_DEVICE_CONFIRM) {
            console.log('> require device confirm');
        } else {
            throw new Error('unkown type');
        }
        return result;
    },

    /* Square */

    squareSingleChatPoll: function(callback, xthrift, squareChatMid, subsId = 0, syncToken = '', continuationToken = '', limits = 1, direction = 2) {
        module.exports.fetchSquareChatEvents((err, success) => {
            callback(err, success);
            for (let key in success.events) {
                module.exports.getOpType(success.events[key]);
            }
        }, xthrift, squareChatMid, 0, syncToken, continuationToken, limits, direction);
    },

    squarePoll: function(callback, xthrift, conToken, syncToken, subsId = 0, limits = 1) {
        let reqx = new TTypes.FetchMyEventsRequest();
        reqx.limit = limits;
        reqx.syncToken = syncToken;
        reqx.continuationToken = conToken;
        reqx.subscriptionId = subsId;
        xthrift.fetchMyEvents(reqx, (err, success) => {
            callback(err, success);
            for (let key in success.events) {
                module.exports.getOpType(success.events[key]);
            }
        });
    },

    getOpType: function(operations) {
        for (let key in TTypes.SquareEventType) {
            if (operations.type == TTypes.SquareEventType[key]) {
                console.info(`[* ${operations.type} ] ${key} `);
            }
        }
    },

    getSquareMessage: function(ops, callback) {
        if (typeof ops.events[0] !== 'undefined') {
            if (ops.events[0].type == 29) {
                let xmsg = ops.events[0].payload.notificationMessage.squareMessage.message;
                let sQmsg = ops.events[0].payload.notificationMessage.squareMessage;
                const txt = (xmsg.text !== '' && xmsg.text != null) ? xmsg.text : '';
                let xtxt = txt.toLowerCase();
                let xdata = {
                    sqmsg: sQmsg,
                    msg: xmsg,
                    txt: xtxt
                }
                callback(xdata);
            } else if (ops.events[0].type == 0) {
                let xmsg = ops.events[0].payload.receiveMessage.squareMessage.message;
                let sQmsg = ops.events[0].payload.receiveMessage.squareMessage;
                const txt = (xmsg.text !== '' && xmsg.text != null) ? xmsg.text : '';
                let xtxt = txt.toLowerCase();
                let xdata = {
                    sqmsg: sQmsg,
                    msg: xmsg,
                    txt: xtxt
                }
                callback(xdata);
            } else if (ops.events[0].type == 1) {
                let xmsg = ops.events[0].payload.sendMessage.squareMessage.message;
                let sQmsg = ops.events[0].payload.sendMessage.squareMessage;
                const txt = (xmsg.text !== '' && xmsg.text != null) ? xmsg.text : '';
                let xtxt = txt.toLowerCase();
                let xdata = {
                    sqmsg: sQmsg,
                    msg: xmsg,
                    txt: xtxt
                }
                callback(xdata);
            }
        }
    },

    squareSendMessage: function(callback, xthrift, to, txt = '', contentType = 0, contentMetadata = {}, seq = 0) {
        let reqx = new TTypes.SendMessageRequest();
        let sQmsg = new TTypes.SquareMessage();
        let message = new TTypes.Message();
        message.text = txt;
        message.to = to;
        message.contentType = contentType;
        message.contentMetadata = contentMetadata;
        sQmsg.message = message;
        sQmsg.fromType = 4;
        //sQmsg.squareMessageRevision = 1;
        reqx.reqSeq = 0;
        reqx.squareChatMid = message.to;
        reqx.squareMessage = sQmsg;
        xthrift.sendMessage(reqx, (err, success) => {
            if (err) throw err;
            //console.info(JSON.stringify(success))
            if (module.exports.isFunction(callback)) {
                callback(err, success);
            }
        });
    },

    squareSimpleSendMessage: function(xthrift, message, txt, seq = 0, callback) {
        message.text = txt;
        let reqx = new TTypes.SendMessageRequest();
        let sQmsg = new TTypes.SquareMessage();
        sQmsg.message = message;
        sQmsg.fromType = 4;
        //sQmsg.squareMessageRevision = 1;
        reqx.reqSeq = 0;
        reqx.squareChatMid = message.to;
        reqx.squareMessage = sQmsg;
        xthrift.sendMessage(reqx, (err, success) => {
            if (err) console.info(err);
            //console.info(JSON.stringify(success))
            if (module.exports.isFunction(callback)) {
                callback(err, success);
            }
        });
    },

    squareSendSticker: function(xthrift, squareChatMid, packageId, stickerId){
		let msg = new TTypes.Message();
        msg.contentMetadata = {
            'STKVER': '100',
            'STKPKGID': packageId,
            'STKID': stickerId
        }
		msg.to = squareChatMid;
		msg.contentType = 7;
        return module.exports.squareSimpleSendMessage(xthrift, msg, '');
	},
	
	squareSendContact: function(xthrift, squareChatMid, mid){
		let msg = new TTypes.Message();
        msg.contentMetadata = {'mid': mid};
		msg.to = squareChatMid;
		msg.contentType = 13;
        return module.exports.squareSimpleSendMessage(xthrift, msg, '');
	},
	
	squareSendGift: function(xthrift, squareChatMid, productId, productType){
		let prod = ['theme','sticker'],xt;
		let msg = new TTypes.Message();
		let random = Math.floor(Math.random() * 10) + 0;
		if(productType == 'sticker'){xt = 'STKPKGID';}else{xt = 'PRDID';}
        if(prod.indexOf(productType) != -1){
            msg.contentMetadata = {
                'MSGTPL': random.toString(),
                'PRDTYPE': productType.toUpperCase(),
                xt: productId
            }
			msg.to = squareChatMid;
		    msg.contentType = 9;
            return module.exports.squareSimpleSendMessage(xthrift, msg, '');
		}
	},

    destroySquareMessage: function(xthrift, squareChatMid, messageId) {
        let rq = new TTypes.DestroyMessageRequest();
        rq.squareChatMid = squareChatMid;
        rq.messageId = messageId;
        return xthrift.destroyMessage(rq);
    },

    searchSquareMembers: function(callback, xthrift, squareMid, continuationToken = '', limit = 50) {
        let rq = new TTypes.SearchSquareMembersRequest();
        rq.squareMid = squareMid;
        rq.searchOption = new TTypes.SquareMemberSearchOption();
        rq.continuationToken = continuationToken;
        rq.limit = limit;

        xthrift.searchSquareMembers(rq, (err, success) => {
            callback(err, success);
        })
    },

    findSquareByInvitationTicket: function(callback, xthrift, invitationTicket) {
        let rq = new TTypes.FindSquareByInvitationTicketRequest();
        rq.invitationTicket = invitationTicket;
        xthrift.findSquareByInvitationTicket(rq, (err, success) => {
            callback(err, success);
        })
    },

    approveSquareMembers: function(xthrift, squareMid, requestedMemberMids = ['']) {
        let rq = new TTypes.ApproveSquareMembersRequest();
        rq.squareMid = squareMid;
        rq.requestedMemberMids = requestedMemberMids;
        return xthrift.approveSquareMembers(rq)
    },

    deleteSquare: function(xthrift, mid) {
        let rq = new TTypes.DeleteSquareRequest();
        rq.mid = mid;
        rq.revision = 0;
        return xthrift.deleteSquare(rq)
    },

    deleteSquareChat: function(xthrift, squareChatMid) {
        let rq = new TTypes.DeleteSquareChatRequest();
        rq.squareChatMid = squareChatMid;
        rq.revision = 0;
        return xthrift.deleteSquareChat(rq);
    },

    createSquare: function(xthrift, name, categoryID, welcomeMessage = '', profileImageObsHash = '', desc = '', searchable = true, type = 1, ableToUseInvitationTicket = true) {
        let rq = new TTypes.CreateSquareRequest();
        rq.square = new TTypes.Square();
        rq.square.name = name;
        rq.square.categoryID = categoryID;
        rq.square.welcomeMessage = welcomeMessage;
        rq.square.profileImageObsHash = profileImageObsHash;
        rq.square.desc = desc;
        rq.square.searchable = searchable;
        rq.square.type = type;
        rq.square.ableToUseInvitationTicket = ableToUseInvitationTicket;
        rq.creator = new TTypes.SquareMember();
        return xthrift.createSquare(rq);
    },

    createSquareChat: function(xthrift, squareMid, name, squareMemberMids) {
        let rq = new TTypes.CreateSquareChatRequest();
        rq.reqSeq = 0;
        rq.squareChat = new TTypes.SquareChat();
        rq.squareChat.squareMid = squareMid;
        rq.squareChat.name = name;
        rq.squareMemberMids = squareMemberMids;
        return xthrift.createSquareChat(rq);
    },

    fetchSquareChatEvents: function(callback, xthrift, squareChatMid, subscriptionId = 0, syncToken = '', continuationToken = '', limit = 50, direction = 2) {
        let rq = new TTypes.FetchSquareChatEventsRequest();
        rq.squareChatMid = squareChatMid;
        rq.subscriptionId = subscriptionId;
        rq.syncToken = syncToken;
        rq.limit = limit;
        rq.direction = direction;
        xthrift.fetchSquareChatEvents(rq, (err, success) => {
            callback(err, success);
        })
    },

    fetchMyEvents: function(callback, xthrift, subscriptionId = 0, syncToken = '', continuationToken = '', limit = 50) {
        let rq = new TTypes.FetchMyEventsRequest();
        rq.subscriptionId = subscriptionId;
        rq.syncToken = syncToken;
        rq.continuationToken = continuationToken;
        rq.limit = limit;
        xthrift.fetchMyEvents(rq, (err, success) => {
            callback(err, success);
        })
    },

    markAsRead: function(xthrift, squareChatMid, messageId) {
        let rq = new TTypes.MarkAsReadRequest();
        rq.squareChatMid = squareChatMid;
        rq.messageId = messageId;
        return xthrift.markAsRead(rq)
    },

    getSquareAuthority: function(callback, xthrift, squareMid) {
        let rq = new TTypes.GetSquareAuthorityRequest();
        rq.squareMid = squareMid;
        xthrift.getSquareAuthority(rq, (err, success) => {
            callback(err, success);
        })
    },

    leaveSquare: function(xthrift, squareMid) {
        let rq = new TTypes.LeaveSquareRequest();
        rq.squareMid = squareMid;
        return xthrift.leaveSquare(rq);
    },

    leaveSquareChat: function(xthrift, squareChatMid, squareChatMemberRevision, sayGoodbye = true) {
        let rq = LeaveSquareChatRequest();
        rq.squareChatMid = squareChatMid;
        rq.sayGoodbye = sayGoodbye;
        rq.squareChatMemberRevision = squareChatMemberRevision;
        return xthrift.leaveSquareChat(rq);
    },

    joinSquareChat: function(callback, xthrift, squareChatMid) {
        let rq = new TTypes.JoinSquareChatRequest();
        rq.squareChatMid = squareChatMid;
        xthrift.joinSquareChat(rq, (err, success) => {
            callback(err, success)
        });
    },

    joinSquare: function(xthrift, squareMid, displayName, profileImageObsHash = '') {
        let rq = new TTypes.JoinSquareRequest();
        rq.squareMid = squareMid;
        rq.member = new TTypes.SquareMember();
        rq.member.squareMid = squareMid;
        rq.member.displayName = displayName;
        rq.member.profileImageObsHash = profileImageObsHash;
        return xthrift.joinSquare(rq);
    },

    inviteToSquare: function(xthrift, squareMid, squareChatMid, invitees = ['']) {
        let rq = new TTypes.InviteToSquareRequest();
        rq.squareMid = squareMid;
        rq.invitees = invitees;
        rq.squareChatMid = squareChatMid;
        return xthrift.inviteToSquare(rq)
    },

    inviteToSquareChat: function(xthrift, squareChatMid, inviteeMids = ['']) {
        let rq = new TTypes.InviteToSquareChatRequest();
        rq.inviteeMids = inviteeMids;
        rq.squareChatMid = squareChatMid;
        return xthrift.inviteToSquareChat(rq);
    },

    getSquareMember: function(callback, xthrift, squareMemberMid) {
        let rq = new TTypes.GetSquareMemberRequest()
        rq.squareMemberMid = squareMemberMid;
        xthrift.getSquareMember(rq, (err, success) => {
            callback(err, success)
        });
    },

    getSquareMembers: function(callback, xthrift, mids = ['']) {
        let rq = new TTypes.GetSquareMembersRequest();
        rq.mids = mids;
        xthrift.getSquareMembers(rq, (err, success) => {
            callback(err, success)
        });
    },

    getSquareMemberRelation: function(callback, xthrift, squareMid, targetSquareMemberMid) {
        let rq = new TTypes.GetSquareMemberRelationRequest();
        rq.squareMid = squareMid;
        rq.targetSquareMemberMid = targetSquareMemberMid;
        xthrift.getSquareMemberRelation(rq, (err, success) => {
            callback(err, success);
        });
    },

    getSquareMemberRelations: function(callback, xthrift, state = 1, continuationToken = '', limit = 50) {
        let rq = new TTypes.GetSquareMemberRelationsRequest();
        rq.state = state; // 1 NONE, 2 BLOCKED
        rq.continuationToken = continuationToken;
        rq.limit = limit;
        xthrift.getSquareMemberRelations(rq, (err, success) => {
            callback(err, success);
        });
    },

    getSquareChatMembers: function(callback, xthrift, squareChatMid, continuationToken = '', limit = 50) {
        let rq = new TTypes.GetSquareChatMembersRequest();
        rq.squareChatMid = squareChatMid;
        rq.continuationToken = continuationToken;
        rq.limit = limit;
        xthrift.getSquareChatMembers(rq, (err, success) => {
            callback(err, success)
        });
    },

    getSquareChatStatus: function(callback, xthrift, squareChatMid) {
        let rq = new TTypes.GetSquareChatStatusRequest();
        rq.squareChatMid = squareChatMid;
        xthrift.getSquareChatStatus(rq, (err, success) => {
            callback(err, success)
        });
    },

    getSquareChat: function(callback, xthrift, squareChatMid) {
        let rq = new TTypes.GetSquareChatRequest();
        rq.squareChatMid = squareChatMid;
        xthrift.getSquareChat(rq, (err, success) => {
            callback(err, success)
        });
    },

    getSquare: function(callback, xthrift, mid) {
        let rq = new TTypes.GetSquareRequest();
        rq.mid = mid;
        xthrift.getSquare(rq, (err, success) => {
            callback(err, success)
        });
    },

    getSquareChatAnnouncements: function(callback, xthrift, squareChatMid) {
        let rq = new TTypes.GetSquareChatAnnouncementsRequest();
        rq.squareChatMid = squareChatMid;
        xthrift.getSquareChatAnnouncements(rq, (err, success) => {
            callback(err, success)
        });
    },

    deleteSquareChatAnnouncement: function(xthrift, squareChatMid, announcementSeq = 0) {
        let rq = new TTypes.DeleteSquareChatAnnouncementRequest();
        rq.squareChatMid = squareChatMid;
        rq.squareChatMid = announcementSeq;
        return xthrift.deleteSquareChatAnnouncement(rq);
    },

    createSquareChatAnnouncement: function(xthrift, squareChatMid, text, messageId = '', senderSquareMemberMid = '') {
        let rq = new TTypes.CreateSquareChatAnnouncementRequest();
        rq.reqSeq = 0;
        rq.squareChatMid = squareChatMid;
        rq.squareChatAnnouncement = new TTypes.SquareChatAnnouncement();
        rq.squareChatAnnouncement.announcementSeq = 0;
        rq.squareChatAnnouncement.type = 0;
        rq.squareChatAnnouncement.contents = new TTypes.SquareChatAnnouncementContents();
        rq.squareChatAnnouncement.contents.textMessageAnnouncementContents = new TTypes.TextMessageAnnouncementContents();
        rq.squareChatAnnouncement.contents.textMessageAnnouncementContents.messageId = messageId;
        rq.squareChatAnnouncement.contents.textMessageAnnouncementContents.text = text;
        rq.squareChatAnnouncement.contents.textMessageAnnouncementContents.senderSquareMemberMid = senderSquareMemberMid;
        return xthrift.createSquareChatAnnouncement(rq)
    },

    getJoinedSquares: function(callback, xthrift, continuationToken = '', limit = 50) {
        let rq = new TTypes.GetJoinedSquaresRequest();
        rq.continuationToken = continuationToken;
        rq.limit = limit;
        xthrift.getJoinedSquares(rq, (err, success) => {
            callback(err, success)
        });
    },

    getJoinedSquareChats: function(callback, xthrift, continuationToken = '', limit = 50) {
        let rq = new TTypes.GetJoinedSquareChatsRequest();
        rq.continuationToken = continuationToken;
        rq.limit = limit;
        xthrift.getJoinedSquareChats(rq, (err, success) => {
            callback
        })
    },

    getJoinableSquareChats: function(callback, xthrift, squareMid, continuationToken = '', limit = 50) {
        let rq = new TTypes.GetJoinableSquareChatsRequest();
        rq.squareMid = squareMid;
        rq.continuationToken = continuationToken;
        rq.limit = limit;
        xthrift.getJoinableSquareChats(rq, (err, success) => {
            callback(err, success)
        });
    },

    getInvitationTicketUrl: function(callback, xthrift, mid) {
        let rq = new TTypes.GetInvitationTicketUrlRequest();
        rq.mid = mid;
        xthrift.getInvitationTicketUrl(rq, (err, success) => {
            callback(err, success)
        });
    },

    getSquareStatus: function(callback, xthrift, squareMid) {
        let rq = new TTypes.GetSquareStatusRequest();
        rq.squareMid = squareMid;
        xthrift.getSquareStatus(rq, (err, success) => {
            callback(err, success)
        });
    },

    getNoteStatus: function(callback, xthrift, squareMid) {
        let rq = new TTypes.GetNoteStatusRequest();
        rq.squareMid = squareMid;
        xthrift.getNoteStatus(rq, (err, success) => {
            callback(err, success)
        });
    },

    searchSquares: function(callback, xthrift, query, continuationToken = '', limit = 50) {
        let rq = new TTypes.SearchSquaresRequest();
        rq.query = query;
        rq.continuationToken = continuationToken;
        rq.limit = limit;
        xthrift.searchSquares(rq, (err, success) => {
            callback(err, success)
        });
    },

    refreshSubscriptions: function(callback, xthrift, subscriptions = ['']) {
        let rq = new TTypes.RefreshSubscriptionsRequest();
        rq.subscriptions = subscriptions;
        xthrift.refreshSubscriptions(rq, (err, success) => {
            callback(err, success)
        });
    },

    removeSubscriptions: function(xthrift, unsubscriptions = ['']) {
        let rq = new TTypes.RemoveSubscriptionsRequest();
        rq.unsubscriptions = unsubscriptions;
        return xthrift.removeSubscriptions(rq);
    },

    uploadToSquare: function(xthrift, xconfig, message, authToken, squareChatMid, paths, type = 'image') {
        //SECRET FORMULA ^_^
    },

    /* Talk */

    /* Talk */
    talkSimpleSendMessage: function(xthrift, message, txt = '', seq = 0) {
        message.text = txt;
        xthrift.sendMessage(0, message, (err, success) => {
            return success;
        })
    },

    talkSendMessage: function(callback, xthrift, txt, to, contentMetadata = {}, contentType = 0, seq = 0) {
        let message = new TTypes.Message();
        message.to = to;
        message.text = txt;
        message.contentMetadata = contentMetadata;
        message.contentType = contentType;
        xthrift.sendMessage(0, message, (err, success) => {
            if (module.exports.isFunction(callback)) {
                callback(err, success);
            } else {
                return success;
            }
        })
    },

    talkSendSticker: function(xthrift, to, packageId, stickerId) {
        let contentMetadata = {
            'STKVER': '100',
            'STKPKGID': packageId,
            'STKID': stickerId
        }
        return module.exports.talkSendMessage('', xthrift, '', to, contentMetadata, 7);
    },

    talkSendContact: function(xthrift, to, mid) {
        let contentMetadata = {
            'mid': mid
        }
        return module.exports.talkSendMessage('', xthrift, '', to, contentMetadata, 13);
    },

    talkSendGift: function(xthrift, to, productId, productType) {
        let prod = ['theme', 'sticker'],
            xt;
        let msg = new TTypes.Message();
        let random = Math.floor(Math.random() * 12) + 0;
        if (productType == 'sticker') {
            xt = 'STKPKGID';
        } else {
            xt = 'PRDID';
        }
        if (prod.indexOf(productType) != -1) {
            msg.contentMetadata = {
                'MSGTPL': random.toString(),
                'PRDTYPE': productType.toUpperCase(),
                xt: productId
            }
            msg.to = to;
            msg.contentType = 9;
            return module.exports.talkSimpleSendMessage(xthrift, msg);
        }
    },

    talkUnsendMessage: function(xthrift, messageId) {
        return xthrift.unsendMessage(0, messageId)
    },

    talkFetchOps(callback, xthrift, revision, count = 0) {
        xthrift.fetchOps(revision, count, 0, 0, (err, success) => {
            for (let key in success) {
                module.exports.talkGetOpType(success[key])
            }
            if (module.exports.isFunction(callback)) {
                callback(err, success)
            } else {
                return success;
            }
        });
    },

    talkGetOpType: function(operations) {
        for (let key in TTypes.OpType) {
            if (operations.type == TTypes.OpType[key]) {
                if (operations.type != 0) {
                    console.info(`[* ${operations.type} ] ${key} `);
                }
            }
        }
    },

    talkGetMessage: function(operation, callback) {
        if (operation.type == 25 || operation.type == 26) {
            const txt = (operation.message.text !== '' && operation.message.text != null) ? operation.message.text : '';
            let message = new TTypes.Message(operation.message);
            Object.assign(message, {
                ct: operation.createdTime.toString()
            });
            callback(message)
        }
    }
}
