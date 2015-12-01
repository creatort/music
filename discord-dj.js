/*
* This is the run script of the module of a PlugDJ inspired bot
*/

var Discord = require('discord.js');
var DiscordDJ = require("./lib/Bot/DiscordDJ.js");
var ChatHandler = require("./lib/Bot/ChatHandler.js");
var Playlist = require('./lib/Bot/Playlist.js');

var child_process = require('child_process');

function getChat(bot, name) {
    var ch = name;
    if(name instanceof String || typeof name == 'string') {
        bot.channels.forEach(function(channel) {
            if(!(channel instanceof Discord.TextChannel)) return;
            if(channel.id == name || channel.name == name) {
                ch = channel;
            }
        });
    }
    return ch;
}

function getRole(server, name) {
    var rl = name;
    if(name instanceof String || typeof name == 'string') {
        server.roles.forEach(function(role) {
            if(role.id == name || role.name == name) {
                rl = role;
            }
        });
    }
    return rl;
}

var bots = require('./bots.json');

// Add custom command
ChatHandler.commands.djrestart = {
    alias: ["dj-restart", "dj-refresh", "dj-reload"],
    run: function(user, bot, dj, msg, args) {
        if(!ChatHandler.hasPermission("managePermissions", user, bot, msg, false)) {
            ChatHandler.msgNoPerm(user, dj);
            return;
        }
        dj.destroy();
        bot.logout(function() {
            bots = require('./bots.json'); // Reload list
            bots.forEach(function(data) {
                if(data.email == dj._email) {
                    init(data);
                }
            });
        });
    }
};

function init(data) {

    if(data.email.length == 0 || data.password.length == 0 || data.voice.length == 0) {
        console.log("You need to configure bots.json");
        process.exit(1);
    }

    var bot = new Discord.Client();

    bot.login(data.email, data.password, function(error) {
        if (error != null) {
            console.log(error);
            process.exit(1);
        }
    });

    bot.on("ready", function() {

        // Join voice channel
        var ch = data.voice;
        bot.channels.forEach(function(channel) {
            if(!(channel instanceof Discord.VoiceChannel)) return;
            if(channel.id == data.voice || channel.name == data.voice) {
                ch = channel;
            }
        });
        bot.joinVoiceChannel(ch, function(error) {
            if(error != null) {
                console.log(error);
                process.exit(1);
            }
        });

        var dj = null;
        var chatOpt = {
            logChat: getChat(bot, data.logChat),
            nowPlayingPrefix: data.nowPlayingPrefix
        };

        // Init bot
        if(data.playlist == null) {
            dj = new DiscordDJ(bot, {
                limit: data.limit,
                djRole: getRole(ch.server, data.djRole),
                listRole: getRole(ch.server, data.listRole)
            }, chatOpt);
        } else {
            var playlist = null;
            if(data.playlist.type == 'youtube') {
                playlist = new Playlist.YoutubePlaylist(data.playlist.key, data.playlist.url);
            } else if(data.playlist.type == 'icy') {
                playlist = new Playlist.IcyPlaylist(data.playlist.url);
            } else {
                playlist = new Playlist.FilePlaylist(data.playlist.path);
            }
            if(data.playlist.shuffle) playlist.shuffle();
            dj = new DiscordDJ(bot, playlist, chatOpt);
        }

        dj._email = data.email;

    });

}

var encoders = ['ffmpeg', 'avconv'];
var canEncode = false;

for(var i = 0; i < encoders.length; i++) {
    var r = child_process.spawnSync(encoders[i]);
    if(!r.error) {
        canEncode = true;
        break;
    }
}

if(!canEncode) {
    console.log("FFmpeg or Libav were not found. I can't encode audio");
    process.exit(1);
}

bots.forEach(function(data) {
    init(data);
});
