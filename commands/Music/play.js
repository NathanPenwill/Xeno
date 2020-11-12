const ytdl = require("ytdl-core")
    , ms = require("../../msparse")
    , { search } = require("scrape-yt")
    , { queue } = require("../../storage")
    , ytdlOpt = { quality: ["95", "93", "258", "256", "22", "140"], highWaterMark: 1 << 24 };

async function play(song, tc, vc, connection) {
    tc.send({
        embed: {
            description: `:notes: **${song.title}** \`${ms(song.length * 1e3)}\``,
            color: 0x7289DA
        }
    });

    if (!connection) connection = await vc.join();

    connection.once("disconnect", () => {
        queue.delete(tc.guild.id);
    });

    const serverQueue = queue.get(tc.guild.id);
    const dispatcher = connection.play(ytdl(song.id, ytdlOpt), { volume: serverQueue.volume / 100, bitrate: 160 });

    serverQueue.dispatcher = dispatcher;

    dispatcher.once("finish", async () => {
        serverQueue.songs.shift();
        if (serverQueue.songs[0]) {
            connection.removeAllListeners("disconnect");
            return play(serverQueue.songs[0], tc, null, connection);
        }
        serverQueue.dispatcher.player.voiceConnection.channel.leave();
    });
}

function filterString(s) {
    return s.replace("|", "\\|").replace("*", "\\*").replace("_", "\\_").replace("~", "\\~").replace("`", "\\`").replace(">", "\\>");
}

module.exports.run = async (client, message, args) => {
    if (args.length == 0) return message.channel.send("Please specify a valid YouTube search query, url or ID!");
    if (!message.member.voice.channelID) return message.channel.send("Please join a voice channel!");

    const url = args.join(" ");
    let song = {};

    if (ytdl.validateURL(url) || ytdl.validateID(url)) {
        const info = await ytdl.getBasicInfo(url).catch(() => { return undefined; });
        if (!info) return message.channel.send("No results");

        song = {
            title: filterString(info.videoDetails.title),
            id: info.videoDetails.videoId,
            length: info.videoDetails.lengthSeconds
        };
    } else if (url.endsWith(".mp3")) {
        song = {
            title: url.replace(".mp3", ""),
            id: url.startsWith("http") ? url : "/root/stereo/commands/Music/" + url,
            length: "MP3"
        }
    } else {
        let results = await search(url, { type: "video", limit: 1, useWorkerThread: true });
        if (results.length == 0) return message.channel.send("No results");
        results = results[0];

        song = {
            title: filterString(results.title),
            id: results.id,
            length: results.duration
        };
    }

    if (!queue.has(message.guild.id)) {
        queue.set(message.guild.id, {
            songs: [song],
            volume: 100
        });

        play(song, message.channel, message.member.voice.channel);
    } else {
        message.channel.send({
            embed: {
                description: `:white_check_mark: **${song.title}** \`${ms(song.length * 1e3)}\``,
                color: 0x7AFF7A
            }
        });

        queue.get(message.guild.id).songs.push(song);
    }
};

module.exports.config = {
    aliases: ["p", "music", "song"],
    description: "Plays music"
};