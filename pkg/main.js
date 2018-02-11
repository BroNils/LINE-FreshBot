const fs = require('fs');
const jsonfile = require('jsonfile');
const unirest = require('unirest');
const TTypes = require('../thrift/line_types');

var config = require('./config');
var thrift = require('thrift-http');

module.exports = {
    /* Usefull thing */

    echo: function(val, callback) {
        callback(val);
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

    saveSquareRev: function(syncToken, continuationToken) {
        let xdata = {
            syncToken: syncToken,
            continuationToken: continuationToken
        }
        jsonfile.writeFile('./data/square.json', xdata, function(err) {
            if (err) {
                return console.log(err);
            }
        });
    },

    restoreSquareRev: function(callback) {
        if (fs.existsSync('./data/square.json')) {
            fs.readFile('./data/square.json', (err, data) => {
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
            if (config.version != parseFloat(data.body)) {
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
        unirest.get('https://' + config.LINE_DOMAIN + path).headers(config.headers).timeout(120000)
            .end((res) => (
                res.error ? res.error : res.body
            ))
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
            .end(async (res) => {
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

    squarePoll: function(callback, xthrift, conToken, syncToken, subsId = 0, limits = 1) {
        //if(typeof config.sync !== 'undefined' && typeof syncToken !== 'undefined'){config.sync = syncToken.toString();}
        let reqx = new TTypes.FetchMyEventsRequest();
        reqx.limit = limits;
        reqx.syncToken = syncToken;
        reqx.continuationToken = conToken;
        reqx.subscriptionId = subsId;
        //config.subsId++;
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
                //console.info(xdata);
                callback(xdata);
            }
        }
    },

    squareSendMessage: function(xthrift, message, txt, seq = 0) {
        message.text = txt;
        let reqx = new TTypes.SendMessageRequest();
        let sQmsg = new TTypes.SquareMessage();
        sQmsg.message = message;
        sQmsg.fromType = 5;
        sQmsg.squareMessageRevision = 1;
        reqx.reqSeq = 0;
        reqx.squareChatMid = message.to;
        reqx.squareMessage = sQmsg;
        try {
            return xthrift.sendMessage(reqx);
        } catch (error) {
            console.log(error);
        }
    },

    squareSendSticker: function(xthrift, squareChatMid, packageId, stickerId) {
        let msg = new TTypes.Message();
        msg.contentMetadata = {
            'STKVER': '100',
            'STKPKGID': packageId,
            'STKID': stickerId
        }
        msg.to = squareChatMid;
        msg.contentType = 7;
        return module.exports.squareSendMessage(xthrift, msg, '');
    },

    squareSendContact: function(xthrift, squareChatMid, mid) {
        let msg = new TTypes.Message();
        msg.contentMetadata = {
            'mid': mid
        };
        msg.to = squareChatMid;
        msg.contentType = 13;
        return module.exports.squareSendMessage(xthrift, msg, '');
    },

    squareSendGift: function(xthrift, squareChatMid, productId, productType) {
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
            return module.exports.squareSendMessage(xthrift, msg, '');
        }
    }
}
