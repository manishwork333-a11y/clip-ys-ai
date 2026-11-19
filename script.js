
/* =================================
   CLIP YS AI - VIDEO UPLOAD SYSTEM
================================= */

document.addEventListener("DOMContentLoaded", function () {

    const up
async function uploadVideoToServer(file) {
    const formData = new FormData();
    formData.append("video", file);

    try {
        const response = await fetch("http://localhost:5000/upload", {
            method: "POST",
            body: formData
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || "Upload failed");
        }

        alert("Video uploaded successfully!");
        console.log(result);

    } catch (error) {
        alert("Backend connection failed: " + error.message);
    }
}
loadInput = document.createElement("input");
    uploadInput.type = "file";
    uploadInput.accept = "video/*";
    uploadInput.style.display = "none";

    document.body.appendChild(uploadInput);

    const uploadButtons = document.querySelectorAll(
        'button, .upload-btn, #uploadBtn, [data-action="upload"]'
    );

    uploadButtons.forEach(function (button) {
        if (
            button.textContent.toLowerCase().includes("upload") ||
            button.textContent.toLowerCase().includes("video") ||
            button.id === "uploadBtn" ||
            button.classList.contains("upload-btn")
        ) {
            button.addEventListener("click", function () {
                uploadInput.click();
            });
        }
    });

    const preview = document.createElement("video");

    preview.controls = true;
    preview.style.width = "100%";
    preview.style.maxWidth = "600px";
    preview.style.marginTop = "15px";
    preview.style.borderRadius = "12px";
    preview.style.display = "none";

    const status = document.createElement("p");
    status.style.marginTop = "12px";

    const container = document.createElement("div");
    container.id = "clipys-upload-preview";
    container.style.marginTop = "20px";

    container.appendChild(preview);
    container.appendChild(status);

    document.body.appendChild(container);

    let currentVideoURL = null;

    uploadInput.addEventListener("change", function () {

        const file = uploadInput.files[0];

        if (!file) return;

        if (!file.type.startsWith("video/")) {
            status.textContent = "Please select a valid video.";
            return;
        }

        if (currentVideoURL) {
            URL.revokeObjectURL(currentVideoURL);
        }

        currentVideoURL = URL.createObjectURL(file);

        preview.src = currentVideoURL;
        preview.style.display = "block";

        status.textContent =
            "Video selected: " + file.name;

        console.log("CLIP YS AI: Video loaded", file.name);
    });

    window.addEventListener("beforeunload", function () {
        if (currentVideoURL) {
            URL.revokeObjectURL(currentVideoURL);
        }
    });

});
