import { supabase } from "./supabase.js";

const coursesContainer = document.getElementById("coursesContainer");
const searchInput = document.getElementById("searchInput");
const filterButtons = document.querySelectorAll(".filter-btn");
const languageSelect = document.getElementById("languageSelect");

let allCourses = [];

// Fetch courses from Supabase
async function loadCourses() {
    const { data, error } = await supabase.from("courses").select("*");
    if (error) {
        console.error("Error fetching courses:", error);
        return;
    }
    allCourses = data;
    renderCourses();
}

// Render courses based on filters and search text
function renderCourses(filterCategory = "all", searchText = "", lang = "all") {
    coursesContainer.innerHTML = "";
    const filtered = allCourses.filter(course => {
        const matchCategory = filterCategory === "all" || course.category === filterCategory;
        const matchSearch = course.title.toLowerCase().includes(searchText.toLowerCase());
        const matchLang = lang === "all" || course.lang === lang;
        return matchCategory && matchSearch && matchLang;
    });

    filtered.forEach(course => {
        const card = document.createElement("a");
        card.href = `course.html?id=${course.id}`; // Link to course page
        card.className = "course-card";
        card.innerHTML = `
            <img src="${course.img}" alt="${course.title}">
            <div class="course-card-content">
                <h3>${course.title}</h3>
                <p>${course.category}</p>
            </div>
        `;
        coursesContainer.appendChild(card);
    });
}

// Event Listeners
filterButtons.forEach(btn => {
    btn.addEventListener("click", () => {
        filterButtons.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        renderCourses(btn.dataset.category, searchInput.value, languageSelect.value);
    });
});

searchInput.addEventListener("input", () => {
    renderCourses(document.querySelector(".filter-btn.active").dataset.category, searchInput.value, languageSelect.value);
});

languageSelect.addEventListener("change", () => {
    renderCourses(document.querySelector(".filter-btn.active").dataset.category, searchInput.value, languageSelect.value);
});

// Initial load
document.addEventListener("DOMContentLoaded", loadCourses);
