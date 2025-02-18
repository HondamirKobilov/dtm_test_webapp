function fixLatexFormulas(latex) {
    if (!latex) return "";
        return latex
            .replace(/–/g, "-") // En Dash → "--"
            .replace(/’/g, "'")  // Right single quote → "'"
            .replace(/“/g, "``") // Opening quote → ``
            .replace(/”/g, "''") // Closing quote → ''
            .replace(/…/g, "\\dots") // Ellipsis → \dots
            .replace(/\u00A0/g, " ") // Non-breaking space → Normal space
            .replace(/⋅/g, " \\cdot ")      // Dot `⋅` ni `\cdot` bilan almashtirish
            .replace(/:/g, " \\div ")
            .replace(/\u2022/g, " \\cdot ")
            .replace(/\\div/g, " : ")
            .replace(/\\bullet/g, " \\cdot ");

}

document.addEventListener("DOMContentLoaded", function () {
    let diagnostikaContainer = document.getElementById("diagnostika-list");
    let examContainer = document.getElementById("exam-container");
    let testContainer = document.getElementById("test-container");
    let questionsDiv = document.getElementById("questions");
    let backButton = document.getElementById("back-to-list");
    let startExamButton = document.querySelector(".start-button");

    // ✅ Diagnostikalar ro‘yxatini yuklash
    fetch("/api/diagnostikas/")
        .then(response => response.json())
        .then(data => {
            diagnostikaContainer.innerHTML = "";
            if (data.diagnostikalar.length === 0) {
                diagnostikaContainer.innerHTML = "<p class='empty-message'>📌 Hozircha diagnostikalar mavjud emas.</p>";
            } else {
                data.diagnostikalar.forEach(diagnostika => {
                    let examCard = document.createElement("div");
                    examCard.className = "exam-card";
                    examCard.innerHTML = `
                        <h3>${diagnostika.name}</h3>
                        <p class="exam-info">
                            <span class="exam-date">📅 ${diagnostika.created_at}</span> 
                            <span class="divider">/</span> 
                            <span class="exam-stats">👥 <strong>${diagnostika.users_count}</strong> ta abituriyent</span>
                        </p>
                        <button class="start-button" data-id="${diagnostika.id}">Test topshirish</button>
                    `;
                    diagnostikaContainer.appendChild(examCard);
                });

                document.querySelectorAll(".start-button").forEach(button => {
                    button.addEventListener("click", function () {
                        let diagnostikaId = this.getAttribute("data-id");
                        localStorage.setItem("diagnostika_id", diagnostikaId);
                        diagnostikaContainer.classList.add("hidden");
                        examContainer.classList.remove("hidden");
                    });
                });
            }
        })
        .catch(error => {
            console.error("Error:", error);
            diagnostikaContainer.innerHTML = "<p class='error-message'>❌ Ma'lumotlarni yuklashda xatolik yuz berdi.</p>";
        });

    // ✅ Ortga qaytish tugmasi
    backButton.addEventListener("click", function () {
        examContainer.classList.add("hidden");
        diagnostikaContainer.classList.remove("hidden");
    });

    fetchSubjects();

    startExamButton.addEventListener("click", function () {
        let diagnostikaId = localStorage.getItem("diagnostika_id");
        let subject1 = document.getElementById("subject1").value;
        let subject2 = document.getElementById("subject2").value;
        let foreignLanguage = document.getElementById("foreign-language").value;

        if (!diagnostikaId) {
            alert("Iltimos, diagnostikani tanlang!");
            return;
        }
        if (!subject1 || !subject2) {
            alert("Iltimos, ikkita mutaxassislik fanini tanlang!");
            return;
        }

        let requestData = {
            subject1: subject1,
            subject2: subject2
        };

        // ✅ Chet tili qo‘shilishi
        if (document.getElementById("foreign-language-container").style.display === "block" && foreignLanguage) {
            requestData.foreign_language = foreignLanguage;
        }

        fetch(`/api/diagnostikas/${diagnostikaId}/tests/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === "success") {
                questionsDiv.innerHTML = "";

                // ✅ FAN NOMLARINI CHIQARISH
                let startNumber = 1; // ✅ Testlarni 1dan 90gacha to‘g‘ri tartibda raqamlash uchun
                data.questions.forEach(subjectData => {
                    let subjectTitle = document.createElement("h2");
                    subjectTitle.textContent = subjectData.subject_name;
                    subjectTitle.classList.add("exam-title");
                    questionsDiv.appendChild(subjectTitle);

                    subjectData.questions.forEach((question) => {
                        let questionBlock = document.createElement("div");
                        questionBlock.className = "exam-card";
                        questionBlock.innerHTML = `
                            <p>${startNumber++}. ${fixLatexFormulas(question.question_text)}</p> 
                            ${question.image ? `<img src="${question.image}" alt="Rasm" width="50%">` : ""}
                            <div class="answers">
                                ${question.answers.map(answer => `
                                    <label>
                                        <input type="radio" name="q${question.id}" value="${answer.id}">
                                        ${fixLatexFormulas(answer.text)}
                                    </label>
                                `).join("")}
                            </div>
                        `;
                        questionsDiv.appendChild(questionBlock);
                    });
                });
                MathJax.typesetPromise().then(() => {
                    console.log("MathJax yangilandi");
                }).catch((err) => console.error("MathJax xatolik berdi:", err));

                // Sahifani testga o‘tkazish
                examContainer.classList.add("hidden");
                testContainer.classList.remove("hidden");
            } else {
                alert("Savollarni yuklashda xatolik yuz berdi!");
            }
        })
        .catch(error => {
            console.error("Xatolik:", error);
            alert("Server bilan bog‘lanishda muammo!");
        });
    });
});

// ✅ SubjectsMapping ishlashi uchun yangilangan funksiya
let subjectsMapping = {
    "Matematika": ["Fizika", "Geografiya", "Chet tili"],
    "Fizika": ["Matematika", "Chet tili"],
    "Chet tili": ["Ona tili va adabiyot"],
    "Kimyo": ["Matematika", "Biologiya"],
    "Biologiya": ["Kimyo", "Ona tili va adabiyot"],
    "Tarix": ["Matematika", "Geografiya", "Chet tili"],
    "Geografiya": ["Matematika"],
    "O‘zbek tili va adabiyot": ["Chet tili"],
    "Ingliz tili": ["Ona tili va adabiyot"]
};


// ✅ Fanlarni yangilash
function fetchSubjects() {
    fetch("/api/subjects/")
        .then(response => response.json())
        .then(data => {
            if (data.status === "success") {
                let subject1Select = document.getElementById("subject1");
                let subject2Select = document.getElementById("subject2");

                subject1Select.innerHTML = `<option value="">1-Fanni tanlang</option>`;
                subject2Select.innerHTML = `<option value="">2-Fanni tanlang</option>`;

                data.subjects.forEach(subject => {
                    let option = document.createElement("option");
                    option.value = subject.name;
                    option.textContent = subject.name;
                    subject1Select.appendChild(option);
                });

                subject1Select.addEventListener("change", function () {
                    updateSecondSubject();
                    checkForeignLanguage();
                });

                subject2Select.addEventListener("change", function () {
                    checkForeignLanguage();
                });
            }
        })
        .catch(error => {
            console.error("Fanlarni yuklashda xatolik:", error);
        });
}


// ✅ SubjectsMapping asosida 2-fanni yangilash
function updateSecondSubject() {
    let subject1 = document.getElementById("subject1").value;
    let subject2Select = document.getElementById("subject2");
    subject2Select.innerHTML = `<option value="">2-Fanni tanlang</option>`;

    if (subjectsMapping[subject1]) {
        subjectsMapping[subject1].forEach(subjectName => {
            let option = document.createElement("option");
            option.value = subjectName;
            option.textContent = subjectName;
            subject2Select.appendChild(option);
        });
    }
    checkForeignLanguage();
}



// ✅ Chet tili tekshirish
function checkForeignLanguage() {
    let subject1 = document.getElementById("subject1").value;
    let subject2 = document.getElementById("subject2").value;
    let foreignLanguageContainer = document.getElementById("foreign-language-container");
    let foreignLanguageSelect = document.getElementById("foreign-language");

    // ✅ Agar Chet tili tanlansa, inputni ko‘rsatish
    if (subject1 === "Chet tili" || subject2 === "Chet tili") {
        foreignLanguageContainer.style.display = "block";

        // ✅ Chet tillarini tozalash va yangidan qo‘shish
        foreignLanguageSelect.innerHTML = "";
        let languages = ["Ingliz tili", "Nemis tili", "Fransuz tili"];

        languages.forEach(lang => {
            let option = document.createElement("option");
            option.value = lang;
            option.textContent = lang;
            foreignLanguageSelect.appendChild(option);
        });

    } else {
        foreignLanguageContainer.style.display = "none";
        foreignLanguageSelect.innerHTML = "";
    }
}
document.addEventListener("DOMContentLoaded", function () {
    let startTime = 3 * 60 * 60; // 3 soat (sekundlarda)
    let timeElement = document.getElementById("remaining-time");
    let stickyTimer = document.getElementById("sticky-timer");
    let participantElement = document.getElementById("participant-count");
    let testButtonsDiv = document.getElementById("test-buttons");

    function formatTime(seconds) {
        let hours = Math.floor(seconds / 3600);
        let minutes = Math.floor((seconds % 3600) / 60);
        let secs = seconds % 60;
        return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }

    function updateTimer() {
        if (startTime > 0) startTime -= 5; // ⏳ Har 5 sekundda 5 soniya kamaytirish
        let formattedTime = formatTime(startTime);
        timeElement.textContent = formattedTime;
        stickyTimer.textContent = formattedTime; // ✅ Sticky taymer ham yangilanadi
    }

    // **Har 5 sekundda ikkalasini ham yangilash**
    setInterval(updateTimer, 5000);

    fetch("/api/diagnostikas/")
        .then(response => response.json())
        .then(data => {
            let totalParticipants = data.diagnostikalar.reduce((sum, diagnostika) => sum + diagnostika.users_count, 0);
            participantElement.textContent = totalParticipants;
        })
        .catch(error => console.error("Xatolik:", error));

    document.querySelector(".finish-button").addEventListener("click", function () {
        alert("Test yakunlandi!");
    });

    // 🔥 Test tugmachalarini yaratish
    testButtonsDiv.innerHTML = "";
    for (let i = 1; i <= 90; i++) {
        let button = document.createElement("button");
        button.textContent = i;
        button.classList.add("test-nav-btn");
        button.setAttribute("data-question", `q${i}`);
        button.addEventListener("click", function () {
            let targetQuestion = document.getElementById(this.getAttribute("data-question"));
            if (targetQuestion) {
                targetQuestion.scrollIntoView({ behavior: "smooth" });
            }
        });
        testButtonsDiv.appendChild(button);
    }

    // **Skroll qilinganda sticky timer ko‘rinishi**
    window.addEventListener("scroll", function () {
        if (window.scrollY > 100) {
            stickyTimer.style.display = "block";
        } else {
            stickyTimer.style.display = "none";
        }
    });
});


//
// document.addEventListener("DOMContentLoaded", function () {
//     let stickyTimer = document.getElementById("sticky-timer");
//     let mainTimer = document.getElementById("remaining-time"); // Pastdagi taymer
//
//     window.addEventListener("scroll", function () {
//         if (window.scrollY > 100) {
//             stickyTimer.style.display = "block"; // Skroll qilinganda chiqadi
//         } else {
//             stickyTimer.style.display = "none"; // Yuqorida bo‘lsa yashirin qoladi
//         }
//     });
//
//     // **Har 5 sekundda taymerni yangilash**
//     setInterval(() => {
//         stickyTimer.textContent = mainTimer.textContent;
//     }, 5000);
// });