import { supabase } from "./supabase.js";

// ✅ Declare all elements at the top of the file, ONLY ONCE.
const courseIntro = document.getElementById("courseIntro");
const coursePlayer = document.getElementById("coursePlayer");
const startLearningBtn = document.getElementById("startLearningBtn");
const certificateBtn = document.getElementById("certificateBtn");

const courseTitleEl = document.getElementById("courseTitle");
const sidebarCourseTitleEl = document.getElementById("sidebarCourseTitle");
const courseThumbnail = document.getElementById("courseThumbnail");
const courseDuration = document.getElementById("courseDuration");
const courseLessonsCount = document.getElementById("courseLessonsCount");
const courseLearningPoints = document.getElementById("courseLearningPoints");
const courseDescriptionEl = document.getElementById("courseDescription");

const lessonList = document.getElementById("lessonList");
const videoPlayer = document.getElementById("videoPlayer");
const lessonTitleEl = document.getElementById("lessonTitle");
const lessonDescriptionEl = document.getElementById("lessonDescription");
const completeLessonBtn = document.getElementById("completeLessonBtn");
const incompleteLessonBtn = document.getElementById("incompleteLessonBtn");

const progressBar = document.getElementById("progressBar");
const progressText = document.getElementById("progressText");

// Global variables for course and user data
let lessons = [];
let completedLessons = new Set();
let currentCourse = null;
let currentUser = {
    phone: localStorage.getItem("userPhone"),
    firstName: null,
    lastName: null
};
let currentLessonId = null;

// Get course ID from URL
const urlParams = new URLSearchParams(window.location.search);
const courseId = urlParams.get("id");

// ✅ Fetch User Data and Course Data
async function loadInitialData() {
    // 1. Fetch User Data
    if (currentUser.phone) {
        const { data: userData, error: userError } = await supabase
            .from("users")
            .select("first_name, last_name")
            .eq("phone", currentUser.phone)
            .single();

        if (userError) {
            console.error("Error fetching user data:", userError);
        } else {
            currentUser.firstName = userData.first_name;
            currentUser.lastName = userData.last_name;
        }
    } else {
        console.warn("User phone not found in localStorage. User may not be logged in.");
        return;
    }

    // 2. Fetch Course Data
    let { data: courseData, error: courseError } = await supabase
        .from("courses")
        .select("*, lessons(*)")
        .eq("id", courseId)
        .single();

    if (courseError) {
        console.error("Error fetching course data:", courseError);
        return;
    }

    currentCourse = courseData;
    lessons = currentCourse.lessons.sort((a, b) => a.order - b.order);

    // 3. Fetch Existing Progress for this User and Course
    const { data: progressData, error: progressError } = await supabase
        .from("progress")
        .select("completed_lessons_ids")
        .eq("user_phone", currentUser.phone)
        .eq("course_id", courseId)
        .single();

    if (progressError && progressError.code !== "PGRST116") {
        console.error("Error fetching user progress:", progressError);
    } else if (progressData && progressData.completed_lessons_ids) {
        try {
            const storedIds = JSON.parse(progressData.completed_lessons_ids);
            completedLessons = new Set(storedIds);
        } catch (e) {
            console.error("Failed to parse completed_lessons_ids from Supabase:", e);
            completedLessons = new Set();
        }
    }

    const thumbnailId = currentCourse.youtube_thumbnail_id || (lessons[0] && lessons[0].youtube_id);
    if (thumbnailId) {
        courseThumbnail.src = `https://img.youtube.com/vi/${thumbnailId}/maxresdefault.jpg`;
    }

    courseTitleEl.textContent = currentCourse.title;
    sidebarCourseTitleEl.textContent = currentCourse.title;

    courseDuration.textContent = currentCourse.duration_text || "N/A";
    courseLessonsCount.textContent = lessons.length;
    courseDescriptionEl.textContent = currentCourse.description;

    courseLearningPoints.innerHTML = "";
    if (Array.isArray(currentCourse.learning_points)) {
        currentCourse.learning_points.forEach(p => {
            let li = document.createElement("li");
            li.textContent = p;
            courseLearningPoints.appendChild(li);
        });
    }

    renderLessons();
    updateProgress();
}

// ✅ Render Lessons in Sidebar
function renderLessons() {
    lessonList.innerHTML = "";
    lessons.forEach((lesson, index) => {
        const li = document.createElement("li");
        li.className = `lesson-item ${currentLessonId === lesson.id ? 'active-lesson' : ''}`;
        li.innerHTML = `
            <img src="https://img.youtube.com/vi/${lesson.youtube_id}/mqdefault.jpg" class="lesson-thumb">
            <span>${lesson.title}</span>
            <span class="status">${completedLessons.has(lesson.id) ? "✔" : ""}</span>
        `;
        li.addEventListener("click", () => loadLesson(lesson.id));
        lessonList.appendChild(li);
    });
}

// ✅ Load Selected Lesson
function loadLesson(lessonId) {
    const lesson = lessons.find(l => l.id === lessonId);
    if (!lesson) return;
    
    currentLessonId = lessonId;
    videoPlayer.src = `https://www.youtube.com/embed/${lesson.youtube_id}?autoplay=1&controls=1&rel=0`;
    lessonTitleEl.textContent = lesson.title;
    lessonDescriptionEl.textContent = lesson.description;

    if (completedLessons.has(currentLessonId)) {
        completeLessonBtn.classList.add("hidden");
        incompleteLessonBtn.classList.remove("hidden");
    } else {
        completeLessonBtn.classList.remove("hidden");
        incompleteLessonBtn.classList.add("hidden");
    }

    renderLessons();
}

// ✅ Mark Lesson as Completed
completeLessonBtn.addEventListener("click", () => {
    if (!currentLessonId) return;
    if (!completedLessons.has(currentLessonId)) {
        completedLessons.add(currentLessonId);
        updateProgress();
        renderLessons();
        completeLessonBtn.classList.add("hidden");
        incompleteLessonBtn.classList.remove("hidden");
    }
});

// ✅ Mark Lesson as Not Completed
incompleteLessonBtn.addEventListener("click", () => {
    if (!currentLessonId) return;
    if (completedLessons.has(currentLessonId)) {
        completedLessons.delete(currentLessonId);
        updateProgress();
        renderLessons();
        incompleteLessonBtn.classList.add("hidden");
        completeLessonBtn.classList.remove("hidden");
    }
});

// ✅ Update Progress (and save to Supabase)
async function updateProgress() {
    const totalLessons = lessons.length;
    const completedCount = completedLessons.size;
    const percent = totalLessons > 0 ? Math.floor((completedCount / totalLessons) * 100) : 0;
    
    progressBar.style.width = percent + "%";
    progressText.textContent = `${percent}% Complete`;

    if (percent >= 100) {
        certificateBtn.classList.remove("hidden");
    } else {
        certificateBtn.classList.add("hidden");
    }

    if (currentUser.phone && currentCourse) {
        // Build the data object to be saved, including only non-null values
        const dataToSave = {
            user_phone: currentUser.phone,
            course_id: currentCourse.id,
            course_title: currentCourse.title,
            progress_percentage: percent,
            completed_lessons_ids: JSON.stringify(Array.from(completedLessons))
        };
        // Add name fields only if they are not null
        if (currentUser.firstName) {
            dataToSave.user_first_name = currentUser.firstName;
        }
        if (currentUser.lastName) {
            dataToSave.user_last_name = currentUser.lastName;
        }

        // Log the data to be sure
        console.log("Saving this data to Supabase:", dataToSave);

        const { error } = await supabase
            .from("progress")
            .upsert(dataToSave, {
                onConflict: "user_phone, course_id"
            });

        if (error) {
            console.error("Error saving progress to Supabase:", error);
        } else {
            console.log("Progress saved successfully!");
        }
    }
}

// ✅ Start Learning Button
startLearningBtn.addEventListener("click", () => {
    courseIntro.classList.add("hidden");
    coursePlayer.classList.remove("hidden");
    if (lessons.length > 0) {
        loadLesson(lessons[0].id);
    } else {
        console.warn("No lessons found for this course.");
    }
});

loadInitialData();

const style = document.createElement('style');
style.textContent = `
    .active-lesson {
        background-color: #3a3a3a !important;
        border-left: 4px solid var(--accent-blue);
        padding-left: 11px !important;
    }
    .btn-certificate {
        background: #28a745;
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        border: none;
        cursor: pointer;
        font-weight: bold;
        transition: background-color 0.3s;
        width: 100%;
        margin-top: 20px;
    }
    .btn-certificate:hover {
        background: #218838;
    }
`;
document.head.appendChild(style);
