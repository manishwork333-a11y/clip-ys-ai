from flask import Flask, request, jsonify
from flask_cors import CORS
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


@app.route("/")
def home():
    return jsonify({
        "name": "Clip YS AI",
        "status": "Backend is ready"
    })


@app.route("/upload", methods=["POST"])
def upload_video():

    print("UPLOAD REQUEST RECEIVED", flush=True)

    if "video" not in request.files:
        return jsonify({"error": "No video selected"}), 400

    video = request.files["video"]

    if not video.filename:
        return jsonify({"error": "Invalid filename"}), 400

    extension = os.path.splitext(video.filename)[1].lower()

    if extension not in [".mp4", ".mov", ".mkv", ".webm"]:
        return jsonify({"error": "Unsupported video format"}), 400

    filename = str(uuid.uuid4()) + extension
    filepath = os.path.join(UPLOAD_FOLDER, filename)

    try:
        video.save(filepath)
        print("UPLOAD SAVED:", filename, flush=True)

    except Exception as error:
        print("UPLOAD ERROR:", str(error), flush=True)
        return jsonify({"error": "Upload failed"}), 500

    return jsonify({
        "message": "Video uploaded successfully",
        "filename": filename
    })


@app.route("/generate", methods=["POST"])
def generate_clips():

    data = request.get_json(silent=True) or {}
    filename = data.get("filename")

    if not filename or os.path.basename(filename) != filename:
        return jsonify({"error": "Invalid filename"}), 400

    filepath = os.path.join(UPLOAD_FOLDER, filename)

    if not os.path.isfile(filepath):
        return jsonify({"error": "Video not found"}), 404

    output_folder = os.path.join(
        CLIPS_FOLDER,
        os.path.splitext(filename)[0]
    )

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
            "error": "Video processing timed out"
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
        "clips": clips,
        "count": len(clips)
    })


@app.errorhandler(413)
def too_large(error):
    return jsonify({
        "error": "Video is too large"
    }), 413


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))

    app.run(
        host="0.0.0.0",
        port=port,
        debug=False
    )
    
