const {
    hostname,
    platform
} = require('os');

const whichPlatform = platform() === 'darwin' ? 'MAC' : 'win32';

const config = {
    LINE_DOMAIN_INDO: 'gd2i.line.naver.jp',
    LINE_DOMAIN_FAST: 'gfv.line.naver.jp',
    LINE_DOMAIN_TOOFAST: 't.line.naver.jp',
    LINE_DOMAIN: 'gf.line.naver.jp',
    LINE_DOMAIN_2ND: 'gd2.line.naver.jp',
    LINE_DOMAIN_3RD: 'gfs.line.naver.jp',
    LINE_OS_URL: 'os.line.naver.jp',
    LINE_HTTP_URL: '/api/v4/TalkService.do',
    LINE_HTTP_URL_2ND: '/api/v3/TalkService.do',
    LINE_RS: '/api/v4p/rs',
    LINE_STICKER_URL: 'dl.stickershop.line.naver.jp/products/',
    LINE_BUDDY: '/BUDDY3',
    LINE_BUDDY_2ND: '/BUDDY4',
    LINE_API_QUERY_PATH_SEC: '/F4',
    LINE_POLL_QUERY_PATH_SEC: '/E4',
    LINE_POLL_QUERY_PATH_THI: '/H4',
    LINE_NORMAL_POLL_QUERY_PATH: '/NP4',
    LINE_COMPACT_MESSAGE_QUERY_PATH: '/C5',
    LINE_CALL_QUERY_PATH: '/V4',
    LINE_POLL_URL: '/P4',
    LINE_POLL_URL_2ND: '/P3',
    LINE_COMMAND_PATH: '/S4',
    LINE_COMMAND_PATH_2: '/S3',
    LINE_CERTIFICATE_URL: '/Q',
    LINE_SQUARE_PATH: '/SQS1',
    LINE_CPF: '/CPF', //What is this ?
    LINE_CHANNEL_PATH: '/CH4',
    LINE_SHOP_PATH: '/SHOP4',
    LINE_SESSION_LINE_URL: '/authct/v1/keys/line',
    LINE_SESSION_NAVER_URL: '/authct/v1/keys/naver',
    LINE_POST_CONTENT_URL: 'https://os.line.naver.jp/talk/m/upload.nhn',
    LINE_POST_CONTENT_URL_2ND: 'https://obs-sg.line-apps.com/talk/m/upload.nhn',
    LINE_POST_PROFILE: 'https://obs-sg.line-apps.com/talk/p/upload.nhn',
    LINE_OBS: 'https://obs-sg.line-apps.com',
    LINE_DL_PROFILE: 'http://dl.profile.line.naver.jp/',
    //X_LINE_APP: 'DESKTOPMAC 10.10.2-YOSEMITE-x64 MAC 4.5.0',
    //X_LINE_APP: 'CHROMEOS\t1.4.13\tChrome_OS\t1',
    //X_LINE_APP: 'CHROMEOS\t1.4.13\tChrome_OS\t1',
    //X_LINE_APP: 'ANDROIDLITE\t1.9.4\tAndroid\t6.0.1'
    X_LINE_APP: 'DESKTOPWIN\t7.18.1\tFDLRCN\t11.2.5',
    ip: '127.0.0.1',
    version: '3.1',
    repo: 'https://github.com/GoogleX133/LINE-SquareBot',
    raw_repo: 'https://raw.githubusercontent.com/GoogleX133/LINE-SquareBot/master/',
    port: 1337,
    revision: 0,
    hostname: hostname(),
    platform: whichPlatform,
    EMAIL_REGEX: /[^@]+@[^@]+\.[^@]+/,
    Headers: {
        'User-Agent': 'Android Mobile Line/7.18.1',
        'Connection': 'keep-alive'
    },
    FILE_DOWNLOAD_LOCATION: '/../download/',
    YT_DL: 'http://www.saveitoffline.com/process/',
    tokenn: '',
    certificate: '',
    chanToken: '',
    verifier: '',
    botmid: '',
    subsId: 0,
    doing: 'no'
};

module.exports = config;
