module.exports = (o => { o = parseInt(o / 1e3); const a = Math.floor(o / 3600), t = Math.floor(o % 3600 / 60); let N = `${0 != a ? a + "h " : ""}${0 != t ? t + "m " : ""}${Math.floor(o % 60)}s`; return "0s" == N && (N = "LIVE"), N; });