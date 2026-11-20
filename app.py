
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename
import subprocess
import os
import uuid

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = "uploads"
CLIPS_FOLDER = "clips"

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(CLIPS_FOLDER, exist_ok=True)

app.config["MAX_CONTENT_LENGTH"] = 1024 * 1024 * 1024

ALLOWED_EXTENSIONS = [".mp4", ".mov", ".mkv", ".webm"]


@app.route("/")
def home():
    return jsonify({
        "name": "Clip YS AI",
        "status": "Backend is ready",
        "version": "2.0"
    })


# VIDEO UPLOAD
@app.route("/upload", methods=["POST"])
def upload_video():

    if "video" not in request.files:
        return jsonify({"error": "No video selected"}), 400

    video = request.files["video"]

    if not video.filename:
        return jsonify({"error": "Invalid filename"}), 400

    extension = os.path.splitext(video.filename)[1].lower()

    if extension not in ALLOWED_EXTENSIONS:
        return jsonify({"error": "Unsupported video format"}), 400

    filename = str(uuid.uuid4()) + extension
    filepath = os.path.join(UPLOAD_FOLDER, filename)

    try:
        video.save(filepath)

    except Exception as error:
        print("UPLOAD ERROR:", str(error), flush=True)
        return jsonify({"error": "Upload failed"}), 500

    return jsonify({
        "message": "Video uploaded successfully",
        "filename": filename
    })


# GENERATE CLIPS
@app.route("/generate", methods=["POST"])
def generate_clips():

    data = request.get_json(silent=True) or {}
    filename = data.get("filename")

    if not filename or os.path.basename(filename) != filename:
        return jsonify({"error": "Invalid filename"}), 400

    filepath = os.path.join(UPLOAD_FOLDER, filename)

    if not os.path.isfile(filepath):
        return jsonify({"error": "Video not found"}), 404

    video_id = os.path.splitext(filename)[0]

    output_folder = os.path.join(CLIPS_FOLDER, video_id)
    os.makedirs(output_folder, exist_ok=True)

    output_pattern = os.path.join(
        output_folder,
        "clip_%03d.mp4"
    )

    command = [
        "ffmpeg",
        "-nostdin",
        "-y",
        "-i", filepath,
        "-map", "0:v:0",
        "-map", "0:a?",
        "-c", "copy",
        "-f", "segment",
        "-segment_time", "30",
        "-reset_timestamps", "1",
        "-segment_format", "mp4",
        output_pattern
    ]

    try:
        result = subprocess.run(
            command,
            capture_output=True,
            text=True,
            timeout=900
        )

        if result.returncode != 0:
            print(result.stderr[-3000:], flush=True)
            return jsonify({
                "error": "Video processing failed"
            }), 500

    except subprocess.TimeoutExpired:
        return jsonify({
            "error": "Processing timed out"
        }), 504

    except Exception as error:
        print("PROCESSING ERROR:", str(error), flush=True)
        return jsonify({
            "error": "Processing error"
        }), 500

    clips = sorted([
        f for f in os.listdir(output_folder)
        if f.endswith(".mp4")
    ])

    if not clips:
        return jsonify({
            "error": "No clips generated"
        }), 500

    return jsonify({
        "message": "Clips generated successfully",
        "video_id": video_id,
        "clips": clips,
        "count": len(clips)
    })


# DOWNLOAD CLIP
@app.route("/download/<video_id>/<clip_name>", methods=["GET"])
def download_clip(video_id, clip_name):

    if not video_id or secure_filename(video_id) != video_id:
        return jsonify({"error": "Invalid video ID"}), 400

    if (
        not clip_name.startswith("clip_")
        or not clip_name.endswith(".mp4")
        or secure_filename(clip_name) != clip_name
    ):
        return jsonify({"error": "Invalid clip name"}), 400

    output_folder = os.path.join(CLIPS_FOLDER, video_id)

    clip_path = os.path.join(output_folder, clip_name)

    if not os.path.isfile(clip_path):
        return jsonify({"error": "Clip not found"}), 404

    return send_from_directory(
        output_folder,
        clip_name,
        as_attachment=True,
        download_name=clip_name
    )


# FILE SIZE ERROR
@app.errorhandler(413)
def too_large(error):
    return jsonify({
        "error": "Video is too large"
    }), 413


# START SERVER
if __name__ == "__main__":

    port = int(os.environ.get("PORT", 5000))

    app.run(
        host="0.0.0.0",
        port=port,
        debug=False
    )
    
