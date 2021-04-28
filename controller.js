const { Song, Album } = require("./models/albums");

const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
const ffmpeg = require("fluent-ffmpeg");
ffmpeg.setFfmpegPath(ffmpegPath);
function streamAudio(req, res) {
    // Music streaming ow yeaaa
    res.contentType("mp3");
    var pathToSong =
        "./Song/60883d8e1a02ff3eac90191f/" + req.params.songid + ".mp3";
    var proc = ffmpeg(pathToSong)
        .toFormat("wav")
        .on("end", function () {
            console.log("end");
        })
        .on("error", function (err) {
            console.log("an error happened: " + err.message);
        })
        // save to stream
        .pipe(res, { end: true });
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
            res.send("Album already exist");
        }
    });
}

function getAlbum(req, res) {
    Album.findOne({ _id: req.params.albumid }).then((response) => {
        res.send(response);
    });
}

function getAlbumList(req, res) {
    Album.find().then((response) => {
        let albumList = [];
        response.map((r) => {
            albumList.push({
                albumname: r.albumname,
                artist: r.artist,
                releaseDate: r.releaseDate,
            });
        });
        res.send(albumList);
    });
}

function getAlbumIcon(req, res) {
    const path = require("path");
    res.sendFile(
        path.resolve(__dirname, "Song/" + req.params.albumid + "/ico.jpg")
    );
}

// ---------- Songs ----------
function addSong(req, res) {
    const songDocument = new Song({
        number: req.body.number,
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
    await Album.findOne({ "songs._id": req.params.songid }).then((response) => {
        albumid = response._id;
        artist = response.artist;
    });
    Album.findOne({ "songs._id": req.params.songid }, { "songs.$": 1 }).then(
        (response) => {
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
        }
    );
}

function getSongDuration(album, song) {
    const getMP3Duration = require("get-mp3-duration");
    const fs = require("fs");
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
    getSongData
};
