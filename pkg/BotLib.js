const fs = require('fs');
const jsonfile = require('jsonfile');
const unirest = require('unirest');
const TTypes = require('../thrift/line_types');
const path = require('path');
const util = require('util');
const mime = require('mime');
const rp = require('request-promise');
const request = require('request');
const dlimg = require('image-downloader');

class BotLib {
    constructor(xthrift, xconfig) {
        this.thrift = xthrift;
        this.config = xconfig;
    }

    /* Usefull thing */

    echo(val) {
        return val;
    }

    isFunction(functionToCheck) {
        return functionToCheck && {}.toString.call(functionToCheck) === '[object Function]';
    }

    saveRevision(xrevision) {
        let xcont = {
            "revision": xrevision
        };
        fs.writeFile("./data/revision.json", JSON.stringify(xcont), function(err) {
            //if(err) {callback(err)}else{callback("DONE")}
        });
    }

    saveJSON(paths, data, callback) {
        jsonfile.writeFile(paths, data, function(err) {
            if (err) {
                return console.log(err);
            }

            callback("DONE");
        });
    }

    saveSquareRev(sqChatMid = '', syncToken, continuationToken) {
        let xdata = {
            syncToken: syncToken,
            continuationToken: continuationToken
        }
        jsonfile.writeFile('./data/square-' + sqChatMid + '.json', xdata, function(err) {
            if (err) {
                return console.log(err);
            }
        });
    }

    restoreSquareRev(callback, sqChatMid = '') {
        if (fs.existsSync('./data/square-' + sqChatMid + '.json')) {
            fs.readFile('./data/square-' + sqChatMid + '.json', (err, data) => {
                if (err) throw err;
                //xstor = JSON.parse(data);
                callback(JSON.parse(data));
            })
        } else {
            callback('error');
        }
    }

    storedJSON(paths, callback) {
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
    }

    str_pad_left(string, pad, length) {
        return (new Array(length + 1).join(pad) + string).slice(-length);
    }

    checkUpdate() {
        unirest.get(this.config.raw_repo + 'version.txt').end((data) => {
            if (this.config.version < parseFloat(data.body) || this.config.version != parseFloat(data.body)) {
                console.info('There are new version of LINE SquareBot \n-> ' + this.config.repo + ' (' + parseFloat(data.body) + ')')
            } else {
                console.info('You are currently using the latest version ! ^_^')
            }
        })
    }

    ambilKata(params, kata1, kata2, callback) {
        if (params.indexOf(kata1) === false) return false;
        if (params.indexOf(kata2) === false) return false;
        let start = params.indexOf(kata1) + kata1.length;
        let end = params.indexOf(kata2, start);
        let returns = params.substr(start, end - start);
        if (this.isFunction(callback)) {
            callback(returns)
        } else {
            return returns;
        }
    }

    getJson(path, callback) {
        unirest.get(path).headers(this.config.Headers).timeout(120000)
            .end((res) => {
                console.info(res.body)
                callback(res);
            })
    }

    /* Auth */

    getRSAKeyInfo(provider, callback) {
        this.thrift.getRSAKeyInfo(provider, (err, success) => {
            callback(success.keynm, success);
        });
    }

    loginWithVerifier(callback) {
        let reqx = new TTypes.LoginRequest();
        console.info(this.config.Headers);
        unirest.get('https://' + this.config.LINE_DOMAIN + this.config.LINE_CERTIFICATE_URL).headers(this.config.headers).timeout(120000)
            .end((res) => {
                reqx.type = 1;
                reqx.verifier = res.body.result.verifier;
                this.thrift.loginZ(reqx, (err, success) => {
                    callback(success);
                })
            })
    }

    setProvider(id, callback) {
        let provider = this.config.EMAIL_REGEX.test(id) ?
            TTypes.IdentityProvider.LINE :
            TTypes.IdentityProvider.NAVER_KR;

        callback(provider === TTypes.IdentityProvider.LINE ?
            this.getJson(this.config.LINE_SESSION_LINE_URL) :
            this.getJson(this.config.LINE_SESSION_NAVER_URL))
    }

    checkLoginResultType(type, result) {
        let certificate, authToken;
        this.config.Headers['X-Line-Access'] = result.authToken || result.verifier;
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
    }

    downloadImage(uri, name, callback) {
        if (!uri.match(/http/g)) {
            callback('FAIL')
        }
        const options = {
            url: uri,
            dest: __dirname + '../download/' + name
        }

        dlimg.image(options).then(({
            filename,
            image
        }) => {
            console.log('File saved to', filename)
            callback(filename)
        }).catch((err) => {
            throw err
        })
    }

    downloadImageLine(uri, name, type, callback) {
        let formatType;
        switch (type) {
            case 3:
                formatType = 'm4a';
                break;
            default:
                formatType = 'jpg';
                break;
        }
        let dir = __dirname + this.config.FILE_DOWNLOAD_LOCATION;
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
        }
        unirest.get(uri)
            .headers({
                ...this.config.Headers
            })
            .end((res) => {
                if (res.error) {
                    console.log(res.error);
                    return 'err';
                }
            }).pipe(fs.createWriteStream(`${dir}/${name}.${formatType}`)).on('finish', () => {
                if (this.isFunction(callback)) {
                    callback(dir + name + "." + formatType);
                } else {
                    return dir + name + "." + formatType;
                }
            });;
    }

    base64Image(src, callback) {
        let datax = fs.readFileSync(src).toString("base64");
        let cx = util.format("data:%s;base64,%s", mime.getType(src), datax);
        callback(cx);
    }

    animeSearch(paths, page = 5, callback) {
        let hasiltxt = "「 Anime Guess 」\n\n";
        const filepath = path.resolve(paths);
        this.base64Image(filepath, (res) => {
            let data = {
                method: 'POST',
                uri: "https://whatanime.ga/search",
                form: {
                    data: res,
                    filter: "*",
                    trial: 5
                },
                headers: {
                    'Host': 'whatanime.ga',
                    'accept': 'application/json, text/javascript, */*; q=0.01',
                    'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
                    'origin': 'https://whatanime.ga',
                    'referer': 'https://whatanime.ga/',
                    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36',
                    'x-requested-with': 'XMLHttpRequest'
                }
            }
            rp(data).then((repos) => {
                let resx = JSON.parse(repos);
                let ret = [];
                for (var i = 0; i < resx.docs.length; i++) {
                    let xdocx = resx.docs[i];
                    let anime = xdocx.anime;
                    let season = xdocx.season;
                    let filex = xdocx.file;
                    let startx = xdocx.start;
                    let endx = xdocx.end;
                    let tokenx = xdocx.token;
                    let tokenThumb = xdocx.tokenthumb;
                    let tox = xdocx.to;
                    let url_r = "https://whatanime.ga/" + season + "/" + encodeURI(anime) + "/" + encodeURI(filex) + "/?start=" + startx + "&end=" + endx + "&token=" + tokenx;
                    let url_t = "https://whatanime.ga/thumbnail.php?season=" + season + "&anime=" + encodeURI(anime) + "&file=" + encodeURI(filex) + "&t=" + tox + "&token=" + tokenx;
                    let xret = {
                        video: url_r,
                        thumbnail: url_t,
                        anime_name: anime,
                        season: season
                    };
                    ret.push(xret);
                    hasiltxt += "Name: " + anime + "\nSeason: " + season + "\n\
\n";
                }
                callback(hasiltxt)
            }).catch(function(err) {
                console.info(err)
            });
        })
    }

    textToSpeech(words, lang, callback) {
        let namef = __dirname + this.config.FILE_DOWNLOAD_LOCATION + "/tts.mp3";
        const options = {
            url: `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(words)}&tl=${lang}&client=tw-ob&ttsspeed=0.24`,
            headers: {
                'Referer': 'http://translate.google.com/',
                'User-Agent': 'stagefright/1.2 (Linux;Android 5.0)'
            }
        }
        rp(options).pipe(fs.createWriteStream(namef)).on('close', () => {
            callback(namef);
        })
    }

    getGithubUser(username, callback) {
        unirest.get('https://api.github.com/users/' + username).headers({
            'User-Agent': 'Awesome-Octocat-App'
        }).end((data) => {
            if (data.body.message && data.body.message == 'Not Found') {
                callback(data.body.message);
            } else {
                callback(data.body)
            }
        })
    }

    getGithubFollowers(username, callback) {
        unirest.get('https://api.github.com/users/' + username + '/followers').headers({
            'User-Agent': 'Awesome-Octocat-App'
        }).end((data) => {
            if (data.body.message && data.body.message == 'Not Found') {
                callback(data.body.message);
            } else {
                callback(data.body)
            }
        })
    }

    getGithubRepo(username, callback) {
        unirest.get('https://api.github.com/users/' + username + '/repos').headers({
            'User-Agent': 'Awesome-Octocat-App'
        }).end((data) => {
            if (data.body.message && data.body.message == 'Not Found') {
                callback(data.body.message);
            } else {
                callback(data.body)
            }
        })
    }

    getJooxLyric(songid, callback) {
        unirest.get('http://api.joox.com/web-fcgi-bin/web_lyric?musicid=' + songid + '&lang=id&country=id').end((data) => {
            this.ambilKata(data.body, "MusicJsonCallback(", ")", (res) => {
                callback(JSON.parse(res))
            });
        })
    }

    getJooxSongInfo(songid, callback) {
        unirest.get('http://api.joox.com/web-fcgi-bin/web_get_songinfo?songid=' + songid + '&lang=id&country=id').end((data) => {
            this.ambilKata(data.body, "MusicInfoCallback(", "\n)", (res) => {
                callback(res)
            });
        })
    }

    getJooxSingerInfo(ids, start = 0, end = 29, callback) {
        unirest.get('http://api.joox.com/web-fcgi-bin/web_album_singer?cmd=2&singerid=' + ids + '&sin=' + start + '&ein=' + end + '&lang=id&country=id').end((data) => {
            callback(JSON.parse(data.body))
        })
    }

    searchJooxByCategories(query, type = 2, page = 1, start = 0, end = 29, callback) {
        // 2 = artist, 1 = album, 3 = playlist
        unirest.get('http://api.joox.com/web-fcgi-bin/web_category_search?lang=id&country=id&type=' + type + '&search_input=' + query + '&pn=' + page + '&sin=' + start + '&ein=' + end).end((data) => {
            callback(JSON.parse(data.body))
        })
    }

    searchJoox(query, page = 1, start = 0, end = 29, callback) {
        unirest.get('http://api.joox.com/web-fcgi-bin/web_search?lang=id&country=id&type=0&search_input=' + query + '&pn=' + page + '&sin=' + start + '&ein=' + end).end((data) => {
            callback(JSON.parse(data.body))
        })
    }

    searchJooxLite(query, callback) {
        unirest.get('http://api.joox.com/web-fcgi-bin/web_smartbox?search=' + query.toString("base64") + '&lang=id&country=id').end((data) => {
            callback(JSON.parse(data.body))
        })
    }

    /* Square */

    squareSingleChatPoll(callback, squareChatMid, subsId = 0, syncToken = '', continuationToken = '', limits = 1, direction = 2) {
        this.fetchSquareChatEvents((err, success) => {
            callback(err, success);
            for (let key in success.events) {
                this.squareGetOpType(success.events[key]);
            }
        }, squareChatMid, 0, syncToken, continuationToken, limits, direction);
    }

    squarePoll(callback, conToken, syncToken, subsId = 0, limits = 1) {
        let reqx = new TTypes.FetchMyEventsRequest();
        reqx.limit = limits;
        reqx.syncToken = syncToken;
        reqx.continuationToken = conToken;
        reqx.subscriptionId = subsId;
        this.thrift.fetchMyEvents(reqx, (err, success) => {
            callback(err, success);
            for (let key in success.events) {
                this.squareGetOpType(success.events[key]);
            }
        });
    }

    searchSquareV2(ticket, callback) {
        this.findSquareByInvitationTicket((err, success) => {
            callback(success)
        }, ticket)
    }

    isJoinedToSquare(squareMid, callback) {
        let res = 'FAIL';
        this.getJoinedSquares((err, success) => {
            for (var i = 0; i < success.squares.length; i++) {
                if (squareMid == success.squares[i].mid) {
                    res = 'DONE';
                    return callback(res)
                }
            }
            callback(res)
        })
    }

    squareGetOpType(operations) {
        for (let key in TTypes.SquareEventType) {
            if (operations.type == TTypes.SquareEventType[key]) {
                console.info(`[* ${operations.type} ] ${key} `);
            }
        }
    }

    getSquareMessage(ops, callback) {
        if (typeof ops.events[0] !== 'undefined') {
            if (ops.events[0].type == 29) {
                let xmsg = ops.events[0].payload.notificationMessage.squareMessage.message;
                let sQmsg = ops.events[0].payload.notificationMessage.squareMessage;
                const txt = (xmsg.text !== '' && xmsg.text != null) ? xmsg.text : '';
                let xtxt = txt.toLowerCase();
                let xdata = {
                    sqmsg: sQmsg,
                    msg: xmsg,
                    text: txt,
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
                    text: txt,
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
                    text: txt,
                    txt: xtxt
                }
                callback(xdata);
            }
        }
    }

    squareSendMessage(callback, to, txt = '', contentType = 0, contentMetadata = {}, seq = 0) {
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
        this.thrift.sendMessage(reqx, (err, success) => {
            if (err) throw err;
            //console.info(JSON.stringify(success))
            if (this.isFunction(callback)) {
                callback(err, success);
            }
        });
    }

    squareSimpleSendMessage(message, txt, seq = 0, callback) {
        message.text = txt;
        let reqx = new TTypes.SendMessageRequest();
        let sQmsg = new TTypes.SquareMessage();
        sQmsg.message = message;
        sQmsg.fromType = 4;
        //sQmsg.squareMessageRevision = 1;
        reqx.reqSeq = 0;
        reqx.squareChatMid = message.to;
        reqx.squareMessage = sQmsg;
        this.thrift.sendMessage(reqx, (err, success) => {
            if (err) console.info(err);
            //console.info(JSON.stringify(success))
            if (this.isFunction(callback)) {
                callback(err, success);
            }
        });
    }

    squareSendSticker(squareChatMid, packageId, stickerId) {
        let msg = new TTypes.Message();
        msg.contentMetadata = {
            'STKVER': '100',
            'STKPKGID': packageId,
            'STKID': stickerId
        }
        msg.to = squareChatMid;
        msg.contentType = 7;
        return this.squareSimpleSendMessage(msg, '');
    }

    squareSendContact(squareChatMid, mid) {
        let msg = new TTypes.Message();
        msg.contentMetadata = {
            'mid': mid
        };
        msg.to = squareChatMid;
        msg.contentType = 13;
        return this.squareSimpleSendMessage(msg, '');
    }

    squareSendGift(squareChatMid, productId, productType) {
        let prod = ['theme', 'sticker'],
            xt;
        let msg = new TTypes.Message();
        let random = Math.floor(Math.random() * 10) + 0;
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
            msg.to = squareChatMid;
            msg.contentType = 9;
            return this.squareSimpleSendMessage(msg, '');
        }
    }

    destroySquareMessage(squareChatMid, messageId) {
        let rq = new TTypes.DestroyMessageRequest();
        rq.squareChatMid = squareChatMid;
        rq.messageId = messageId;
        return this.thrift.destroyMessage(rq);
    }

    searchSquareMembers(callback, squareMid, continuationToken = '', limit = 50) {
        let rq = new TTypes.SearchSquareMembersRequest();
        rq.squareMid = squareMid;
        rq.searchOption = new TTypes.SquareMemberSearchOption();
        rq.continuationToken = continuationToken;
        rq.limit = limit;

        this.thrift.searchSquareMembers(rq, (err, success) => {
            callback(err, success);
        })
    }

    findSquareByInvitationTicket(callback, invitationTicket) {
        let rq = new TTypes.FindSquareByInvitationTicketRequest();
        rq.invitationTicket = invitationTicket;
        this.thrift.findSquareByInvitationTicket(rq, (err, success) => {
            callback(err, success);
        })
    }

    approveSquareMembers(squareMid, requestedMemberMids = ['']) {
        let rq = new TTypes.ApproveSquareMembersRequest();
        rq.squareMid = squareMid;
        rq.requestedMemberMids = requestedMemberMids;
        return this.thrift.approveSquareMembers(rq)
    }

    deleteSquare(mid) {
        let rq = new TTypes.DeleteSquareRequest();
        rq.mid = mid;
        rq.revision = 0;
        return this.thrift.deleteSquare(rq)
    }

    deleteSquareChat(squareChatMid) {
        let rq = new TTypes.DeleteSquareChatRequest();
        rq.squareChatMid = squareChatMid;
        rq.revision = 0;
        return this.thrift.deleteSquareChat(rq);
    }

    createSquare(name, categoryID, welcomeMessage = '', profileImageObsHash = '', desc = '', searchable = true, type = 1, ableToUseInvitationTicket = true) {
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
        return this.thrift.createSquare(rq);
    }

    createSquareChat(squareMid, name, squareMemberMids) {
        let rq = new TTypes.CreateSquareChatRequest();
        rq.reqSeq = 0;
        rq.squareChat = new TTypes.SquareChat();
        rq.squareChat.squareMid = squareMid;
        rq.squareChat.name = name;
        rq.squareMemberMids = squareMemberMids;
        return this.thrift.createSquareChat(rq);
    }

    fetchSquareChatEvents(callback, squareChatMid, subscriptionId = 0, syncToken = '', continuationToken = '', limit = 50, direction = 2) {
        let rq = new TTypes.FetchSquareChatEventsRequest();
        rq.squareChatMid = squareChatMid;
        rq.subscriptionId = subscriptionId;
        rq.syncToken = syncToken;
        rq.limit = limit;
        rq.direction = direction;
        this.thrift.fetchSquareChatEvents(rq, (err, success) => {
            callback(err, success);
        })
    }

    fetchMyEvents(callback, subscriptionId = 0, syncToken = '', continuationToken = '', limit = 50) {
        let rq = new TTypes.FetchMyEventsRequest();
        rq.subscriptionId = subscriptionId;
        rq.syncToken = syncToken;
        rq.continuationToken = continuationToken;
        rq.limit = limit;
        this.thrift.fetchMyEvents(rq, (err, success) => {
            callback(err, success);
        })
    }

    markAsRead(squareChatMid, messageId) {
        let rq = new TTypes.MarkAsReadRequest();
        rq.squareChatMid = squareChatMid;
        rq.messageId = messageId;
        return this.thrift.markAsRead(rq)
    }

    getSquareAuthority(callback, squareMid) {
        let rq = new TTypes.GetSquareAuthorityRequest();
        rq.squareMid = squareMid;
        this.thrift.getSquareAuthority(rq, (err, success) => {
            callback(err, success);
        })
    }

    leaveSquare(squareMid) {
        let rq = new TTypes.LeaveSquareRequest();
        rq.squareMid = squareMid;
        return this.thrift.leaveSquare(rq);
    }

    leaveSquareChat(squareChatMid, squareChatMemberRevision, sayGoodbye = true) {
        let rq = LeaveSquareChatRequest();
        rq.squareChatMid = squareChatMid;
        rq.sayGoodbye = sayGoodbye;
        rq.squareChatMemberRevision = squareChatMemberRevision;
        return this.thrift.leaveSquareChat(rq);
    }

    joinSquareChat(callback, squareChatMid) {
        let rq = new TTypes.JoinSquareChatRequest();
        rq.squareChatMid = squareChatMid;
        this.thrift.joinSquareChat(rq, (err, success) => {
            if (this.isFunction(callback)) {
                callback(err, success)
            } else {
                return success;
            }
        });
    }

    joinSquare(squareMid, displayName, profileImageObsHash = '', callback) {
        let rq = new TTypes.JoinSquareRequest();
        rq.squareMid = squareMid;
        rq.member = new TTypes.SquareMember();
        rq.member.squareMid = squareMid;
        rq.member.displayName = displayName;
        rq.member.profileImageObsHash = profileImageObsHash;
        this.thrift.joinSquare(rq, (err, success) => {
            if (this.isFunction(callback)) {
                callback(err, success)
            } else {
                return success;
            }
        });
    }

    inviteToSquare(squareMid, squareChatMid, invitees = ['']) {
        let rq = new TTypes.InviteToSquareRequest();
        rq.squareMid = squareMid;
        rq.invitees = invitees;
        rq.squareChatMid = squareChatMid;
        return this.thrift.inviteToSquare(rq)
    }

    inviteToSquareChat(squareChatMid, inviteeMids = ['']) {
        let rq = new TTypes.InviteToSquareChatRequest();
        rq.inviteeMids = inviteeMids;
        rq.squareChatMid = squareChatMid;
        return this.thrift.inviteToSquareChat(rq);
    }

    getSquareMember(callback, squareMemberMid) {
        let rq = new TTypes.GetSquareMemberRequest()
        rq.squareMemberMid = squareMemberMid;
        this.thrift.getSquareMember(rq, (err, success) => {
            callback(err, success)
        });
    }

    getSquareMembers(callback, mids = ['']) {
        let rq = new TTypes.GetSquareMembersRequest();
        rq.mids = mids;
        this.thrift.getSquareMembers(rq, (err, success) => {
            callback(err, success)
        });
    }

    getSquareMemberRelation(callback, squareMid, targetSquareMemberMid) {
        let rq = new TTypes.GetSquareMemberRelationRequest();
        rq.squareMid = squareMid;
        rq.targetSquareMemberMid = targetSquareMemberMid;
        this.thrift.getSquareMemberRelation(rq, (err, success) => {
            callback(err, success);
        });
    }

    getSquareMemberRelations(callback, state = 1, continuationToken = '', limit = 50) {
        let rq = new TTypes.GetSquareMemberRelationsRequest();
        rq.state = state; // 1 NONE, 2 BLOCKED
        rq.continuationToken = continuationToken;
        rq.limit = limit;
        this.thrift.getSquareMemberRelations(rq, (err, success) => {
            callback(err, success);
        });
    }

    getSquareChatMembers(callback, squareChatMid, continuationToken = '', limit = 50) {
        let rq = new TTypes.GetSquareChatMembersRequest();
        rq.squareChatMid = squareChatMid;
        rq.continuationToken = continuationToken;
        rq.limit = limit;
        this.thrift.getSquareChatMembers(rq, (err, success) => {
            callback(err, success)
        });
    }

    getSquareChatStatus(callback, squareChatMid) {
        let rq = new TTypes.GetSquareChatStatusRequest();
        rq.squareChatMid = squareChatMid;
        this.thrift.getSquareChatStatus(rq, (err, success) => {
            callback(err, success)
        });
    }

    getSquareChat(callback, squareChatMid) {
        let rq = new TTypes.GetSquareChatRequest();
        rq.squareChatMid = squareChatMid;
        this.thrift.getSquareChat(rq, (err, success) => {
            callback(err, success)
        });
    }

    getSquare(callback, mid) {
        let rq = new TTypes.GetSquareRequest();
        rq.mid = mid;
        this.thrift.getSquare(rq, (err, success) => {
            callback(err, success)
        });
    }

    getSquareChatAnnouncements(callback, squareChatMid) {
        let rq = new TTypes.GetSquareChatAnnouncementsRequest();
        rq.squareChatMid = squareChatMid;
        this.thrift.getSquareChatAnnouncements(rq, (err, success) => {
            callback(err, success)
        });
    }

    deleteSquareChatAnnouncement(squareChatMid, announcementSeq = 0) {
        let rq = new TTypes.DeleteSquareChatAnnouncementRequest();
        rq.squareChatMid = squareChatMid;
        rq.squareChatMid = announcementSeq;
        return this.thrift.deleteSquareChatAnnouncement(rq);
    }

    createSquareChatAnnouncement(squareChatMid, text, messageId = '', senderSquareMemberMid = '') {
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
        return this.thrift.createSquareChatAnnouncement(rq)
    }

    getJoinedSquares(callback, continuationToken = '', limit = 50) {
        let rq = new TTypes.GetJoinedSquaresRequest();
        rq.continuationToken = continuationToken;
        rq.limit = limit;
        this.thrift.getJoinedSquares(rq, (err, success) => {
            callback(err, success)
        });
    }

    getJoinedSquareChats(callback, continuationToken = '', limit = 50) {
        let rq = new TTypes.GetJoinedSquareChatsRequest();
        rq.continuationToken = continuationToken;
        rq.limit = limit;
        this.thrift.getJoinedSquareChats(rq, (err, success) => {
            callback(err, success)
        })
    }

    getJoinableSquareChats(callback, squareMid, continuationToken = '', limit = 50) {
        let rq = new TTypes.GetJoinableSquareChatsRequest();
        rq.squareMid = squareMid;
        rq.continuationToken = continuationToken;
        rq.limit = limit;
        this.thrift.getJoinableSquareChats(rq, (err, success) => {
            callback(err, success)
        });
    }

    getInvitationTicketUrl(callback, mid) {
        let rq = new TTypes.GetInvitationTicketUrlRequest();
        rq.mid = mid;
        this.thrift.getInvitationTicketUrl(rq, (err, success) => {
            callback(err, success)
        });
    }

    getSquareStatus(callback, squareMid) {
        let rq = new TTypes.GetSquareStatusRequest();
        rq.squareMid = squareMid;
        this.thrift.getSquareStatus(rq, (err, success) => {
            callback(err, success)
        });
    }

    getNoteStatus(callback, squareMid) {
        let rq = new TTypes.GetNoteStatusRequest();
        rq.squareMid = squareMid;
        this.thrift.getNoteStatus(rq, (err, success) => {
            callback(err, success)
        });
    }

    searchSquares(callback, query, continuationToken = '', limit = 1) {
        let rq = new TTypes.SearchSquaresRequest();
        rq.query = query;
        rq.continuationToken = continuationToken;
        rq.limit = limit;
        this.thrift.searchSquares(rq, (err, success) => {
            callback(err, success)
        });
    }

    refreshSubscriptions(callback, subscriptions = ['']) {
        let rq = new TTypes.RefreshSubscriptionsRequest();
        rq.subscriptions = subscriptions;
        this.thrift.refreshSubscriptions(rq, (err, success) => {
            callback(err, success)
        });
    }

    removeSubscriptions(unsubscriptions = ['']) {
        let rq = new TTypes.RemoveSubscriptionsRequest();
        rq.unsubscriptions = unsubscriptions;
        return this.thrift.removeSubscriptions(rq);
    }

    /* Talk */

    talkSimpleSendMessage(message, txt = '', seq = 0) {
        message.text = txt;
        this.thrift.sendMessage(0, message, (err, success) => {
            return success;
        })
    }

    talkSendMessage(callback, txt, to, contentMetadata = {}, contentType = 0, seq = 0) {
        let message = new TTypes.Message();
        message.to = to;
        message.text = txt;
        message.contentMetadata = contentMetadata;
        message.contentType = contentType;
        this.thrift.sendMessage(0, message, (err, success) => {
            if (this.isFunction(callback)) {
                callback(err, success);
            } else {
                return success;
            }
        })
    }

    talkSendSticker(to, packageId, stickerId) {
        let contentMetadata = {
            'STKVER': '100',
            'STKPKGID': packageId,
            'STKID': stickerId
        }
        return this.talkSendMessage('', '', to, contentMetadata, 7);
    }

    talkSendContact(to, mid) {
        let contentMetadata = {
            'mid': mid
        }
        return this.talkSendMessage('', '', to, contentMetadata, 13);
    }

    talkSendGift(to, productId, productType) {
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
            return this.talkSimpleSendMessage(msg);
        }
    }

    talkUnsendMessage(messageId) {
        return this.thrift.unsendMessage(0, messageId)
    }

    talkFetchOps(callback, revision, count = 0) {
        this.thrift.fetchOps(revision, count, 0, 0, (err, success) => {
            for (let key in success) {
                this.talkGetOpType(success[key])
            }
            if (this.isFunction(callback)) {
                callback(err, success)
            } else {
                return success;
            }
        });
    }

    talkGetOpType(operations) {
        for (let key in TTypes.OpType) {
            if (operations.type == TTypes.OpType[key]) {
                if (operations.type != 0) {
                    console.info(`[* ${operations.type} ] ${key} `);
                }
            }
        }
    }

    talkGetMessage(operation, callback) {
        if (operation.type == 25 || operation.type == 26) {
            const txt = (operation.message.text !== '' && operation.message.text != null) ? operation.message.text : '';
            let message = new TTypes.Message(operation.message);
            Object.assign(message, {
                ct: operation.createdTime.toString()
            });
            callback(message)
        }
    }

    talkGetContacts(mid = [], callback) {
        this.thrift.getContacts(mid, (err, success) => {
            if (this.isFunction(callback)) {
                callback(err, success)
            } else {
                return success
            }
        })
    }

    talkGetContact(mid, callback) {
        this.thrift.getContact(mid, (err, success) => {
            if (this.isFunction(callback)) {
                callback(err, success)
            } else {
                return success
            }
        })
    }

    talkKickMember(group, memid) {
        return this.thrift.kickoutFromGroup(0, group, memid);
    }

    talkCancel(groupid, member) {
        return this.thrift.cancelGroupInvitation(0, groupid, member);
    }

    talkGetGroupsJoined(callback) {
        this.thrift.getGroupIdsJoined((err, success) => {
            if (this.isFunction(callback)) {
                callback(err, success)
            } else {
                return success
            }
        })
    }

    talkGetProfile(callback) {
        this.thrift.getProfile((err, success) => {
            if (this.isFunction(callback)) {
                callback(err, success)
            } else {
                return success
            }
        });
    }

    talkAcceptGroupInvitation(groupid) {
        return this.thrift.acceptGroupInvitation(0, groupid);
    }

    talkInviteIntoGroup(group, memid) {
        return this.thrift.inviteIntoGroup(0, group, memid);
    }

    talkUpdateGroup(group) {
        return this.thrift.updateGroup(0, group)
    }

    talkGetGroups(gid = [], callback) {
        this.thrift.getGroups(gid, (err, success) => {
            if (this.isFunction(callback)) {
                callback(err, success)
            } else {
                return success
            }
        })
    }

    talkGetRoom(rid, callback) {
        this.thrift.getRoom(rid, (err, success) => {
            if (this.isFunction(callback)) {
                callback(err, success)
            } else {
                return success
            }
        })
    }

    talkGetGroup(mid, callback) {
        this.thrift.getGroup(gid, (err, success) => {
            if (this.isFunction(callback)) {
                callback(err, success)
            } else {
                return success
            }
        })
    }

    talkGetAllContactIds(callback) {
        this.thrift.getAllContactIds((err, success) => {
            if (this.isFunction(callback)) {
                callback(err, success)
            } else {
                return success
            }
        })
    }

    talkFindGroupByTicket(ticket, callback) {
        this.thrift.findGroupByTicket(ticket, (err, success) => {
            if (this.isFunction(callback)) {
                callback(err, success)
            } else {
                return success
            }
        })
    }

    talkAcceptGroupInvitationByTicket(ticket, gid, callback) {
        this.thrift.acceptGroupInvitationByTicket(0, gid, ticket, (err, success) => {
            if (this.isFunction(callback)) {
                callback(err, success)
            } else {
                return success
            }
        })
    }
}

module.exports = BotLib;
