const { Song, Album } = require("./models/albums");

const path = require("path");
const fs = require("fs");
const getMP3Duration = require("get-mp3-duration");
const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
const ffmpeg = require("fluent-ffmpeg");
ffmpeg.setFfmpegPath(ffmpegPath);
async function streamAudio(req, res) {
    // Music streaming ow yeaaa
    var pathToSong = "";
    if (req.params.songid !== "undefined") {
        res.contentType("mp3");
        await Album.findOne({ "songs._id": req.params.songid }).then(
            (response) => {
                pathToSong =
                    "./Song/" + response._id + "/" + req.params.songid + ".mp3";
            }
        );
        var proc = ffmpeg(pathToSong)
            .toFormat("wav")
            .on("end", function () {})
            .on("error", function (err) {})
            // save to stream
            .pipe(res, { end: true });
    } else {
        res.status(404).send("Not found");
    }
}

// ---------- Albums ----------
function addAlbum(req, res) {
    const albumDocument = new Album({
        albumname: req.body.albumName,
        artist: req.body.artist,
        releaseDate: req.body.releaseDate,
        songs: [],
    });

    Album.find({
        albumname: req.body.albumName,
        artist: req.body.artist,
        releaseDate: req.body.releaseDate,
    }).then((response) => {
        if (response.length == 0) {
            albumDocument
                .save()
                .then(res.send("Done"))
                .catch((err) => {
                    console.log(err);
                });
        } else {
            res.status(409).send("The album is already exist in the system.");
        }
    });
}

function getAlbum(req, res) {
    if (req.params.albumid !== "undefined") {
        Album.findOne({ _id: req.params.albumid }).then((response) => {
            res.send(response);
        });
    } else {
        res.status(404).send("Not found");
    }
}

function getAlbumList(req, res) {
    Album.find().then((response) => {
        let albumList = [];
        response.map((r) => {
            albumList.push({
                id: r._id,
                albumname: r.albumname,
                artist: r.artist,
                releaseDate: r.releaseDate,
            });
        });
        res.send(albumList);
    });
}

function getAlbumIcon(req, res) {
    let pathToImg = path.resolve(
        __dirname,
        "Song/" + req.params.albumid + "/ico.jpg"
    );
    if (fs.existsSync(pathToImg)) {
        res.sendFile(
            path.resolve(
                __dirname,
                "Song/" + req.params.albumid + "/ico.jpg"
            )
        );
    } else {
        res.status(404).send("Not found");
    }
}

// ---------- Songs ----------
function addSong(req, res) {
    const songDocument = new Song({
        duration: req.body.duration,
        title: req.body.title,
    });

    Album.updateOne(
        { albumname: req.body.albumname },
        { $push: { songs: songDocument } }
    ).then((result) => console.log(result));

    res.send("Done");
}

async function getSongData(req, res) {
    let albumid = "";
    let artist = "";
    if (req.params.songid !== "undefined") {
        await Album.findOne({ "songs._id": req.params.songid }).then(
            (response) => {
                albumid = response._id;
                artist = response.artist;
            }
        );
        Album.findOne(
            { "songs._id": req.params.songid },
            { "songs.$": 1 }
        ).then((response) => {
            res.write(
                JSON.stringify({
                    _id: response.songs[0]._id,
                    title: response.songs[0].title,
                    album: albumid,
                    artist,
                    duration: getSongDuration(albumid, req.params.songid),
                })
            );
            res.end();
        });
    } else {
        res.status(404).send("Not found");
    }
}

function getSongDuration(album, song) {
    const buffer = fs.readFileSync("./Song/" + album + "/" + song + ".mp3");
    const duration = getMP3Duration(buffer) / 1000;
    return duration;
}

module.exports = {
    streamAudio,

    addAlbum,
    getAlbum,
    getAlbumList,
    getAlbumIcon,

    addSong,
    getSongData,
};
