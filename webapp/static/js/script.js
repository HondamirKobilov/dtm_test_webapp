function fixLatexFormulas(latex) {
    if (!latex) return "";
    return latex
        .replace(/–/g, "-") // En Dash → "-"
        .replace(/’/g, "'")  // Right single quote → "'"
        .replace(/“/g, "``") // Opening quote → ``
        .replace(/”/g, "''") // Closing quote → ''
        .replace(/…/g, "\\dots") // Ellipsis → \dots
        .replace(/\u00A0/g, " ") // Non-breaking space → Normal space
        .replace(/⋅/g, " \\cdot ") // `⋅` ni `\cdot` bilan almashtirish
        .replace(/:/g, " \\div ") // ":" ni `\div` bilan almashtirish
        .replace(/\u2022/g, " \\cdot ") // Bullet point ni `\cdot` bilan almashtirish
        .replace(/\\div/g, " : ") // Agar noto‘g‘ri `\div` kelgan bo‘lsa almashtirish
        .replace(/\\bullet/g, " \\cdot ") // Bullet ni almashtirish
        .replace(/\$(.*?)\$/g, "\\($1\\)") // `$...$` ni inline MathJax formatiga o'tkazish
        .replace(/\$\$(.*?)\$\$/g, "\\[$1\\]"); // `$$...$$` ni block MathJax formatiga o'tkazish
}
let selectedSubjects = {};
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
                    examCard.className = "exam-carta";
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
        selectedSubjects.subject1 = subject1;
        selectedSubjects.subject2 = subject2;
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
                let startNumber = 1; // Testlarni 1 dan 90 gacha raqamlash
                data.questions.forEach(subjectData => {
                // 🔹 **Fan nomini chiqaramiz**
                let subjectTitle = document.createElement("h2");
                subjectTitle.textContent = subjectData.subject_name;
                subjectTitle.classList.add("exam-title");
                questionsDiv.appendChild(subjectTitle);
                subjectData.questions.forEach((question) => {
                    let questionBlock = document.createElement("div");
                    questionBlock.className = "exam-card";
                    questionBlock.id = `q${startNumber}`; // Har bir savolga ID qo‘shiladi (q1, q2, ..., q90)

                    questionBlock.innerHTML = `
                        <p><strong>${startNumber}.</strong> ${fixLatexFormulas(question.question_text)}</p> 
                        ${question.image ? `<img src="${question.image}" alt="Rasm" width="50%">` : ""}
                        <div class="answers">
                            ${question.answers.map(answer => `
                                <label>
                                    <input type="radio" name="q${startNumber}" value="${answer.id}">
                                    ${fixLatexFormulas(answer.text)}
                                </label>
                            `).join("")}
                        </div>
                    `;

                    questionsDiv.appendChild(questionBlock);
                    startNumber++; // **Test raqamini oshiramiz (1,2,3,...,90)**
                });
            });

            // ✅ **Variant tanlanganda pastdagi tugma yashil bo‘lishi**
            document.querySelectorAll(".answers input[type='radio']").forEach(radio => {
                radio.addEventListener("change", function () {
                    let questionNumber = this.name.replace("q", ""); // Masalan: q5 -> 5
                    let relatedButton = document.querySelector(`.test-nav-btn[data-question="q${questionNumber}"]`);

                    // **Avval barcha tugmalardan "selected" klassini olib tashlaymiz**
                    document.querySelectorAll(".test-nav-btn").forEach(btn => {
                        btn.classList.remove("selected");
                    });

                    if (relatedButton) {
                        relatedButton.classList.add("selected"); // ✅ Tugmaning rangi yashil bo‘ladi
                    }
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
let testStartTime = null;
document.addEventListener("DOMContentLoaded", function () {
    let startTime = 3 * 60 * 60; // ⏳ 3 soat (sekundlarda)
    let timeElement = document.getElementById("remaining-time");
    let stickyTimer = document.getElementById("sticky-timer");
    let participantElement = document.getElementById("participant-count");
    let testButtonsDiv = document.getElementById("test-buttons");
    testStartTime = Date.now();
    function formatTime(seconds) {
        let hours = Math.floor(seconds / 3600);
        let minutes = Math.floor((seconds % 3600) / 60);
        let secs = seconds % 60;
        return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }

    function updateTimer() {
        if (startTime > 0) startTime -= 1; // ⏳ Har 5 sekundda 5 soniya kamaytirish
        let formattedTime = formatTime(startTime);
        timeElement.textContent = formattedTime;
        stickyTimer.textContent = formattedTime; // ✅ Sticky taymer ham yangilanadi
    }

    // **Har 5 sekundda ikkalasini ham yangilash**
    setInterval(updateTimer, 1000);

    fetch("/api/diagnostikas/")
        .then(response => response.json())
        .then(data => {
            let totalParticipants = data.diagnostikalar.reduce((sum, diagnostika) => sum + diagnostika.users_count, 0);
            participantElement.textContent = totalParticipants;
        })
        .catch(error => console.error("Xatolik:", error));

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
                targetQuestion.scrollIntoView({ behavior: "smooth", block: "center" });
            }
        });

        testButtonsDiv.appendChild(button);
    }
    // ✅ **Variant tanlanganda mos keluvchi tugmani ko‘k qilish**
    function updateButtonColors() {
        document.querySelectorAll(".test-nav-btn").forEach(button => {
            button.classList.remove("selected"); // 🔄 Avvalgi tanlangan tugmalardan "selected" klassini olib tashlaymiz
        });

        document.querySelectorAll(".exam-card input[type='radio']:checked").forEach(radio => {
            let questionNumber = radio.name.replace("q", ""); // Masalan: q5 -> 5
            let relatedButton = document.querySelector(`.test-nav-btn[data-question="q${questionNumber}"]`);

            if (relatedButton) {
                relatedButton.classList.add("selected"); // ✅ **Selected klass qo‘shiladi**
            }
        });
    }

    // ✅ **Variant tanlanganda ishlaydi**
    document.addEventListener("change", function (event) {
        if (event.target.matches(".exam-card input[type='radio']")) {
            updateButtonColors();
        }
    });

    // **Skroll qilinganda sticky timer ko‘rinishi**
    window.addEventListener("scroll", function () {
        if (window.scrollY > 100) {
            stickyTimer.style.display = "block";
        } else {
            stickyTimer.style.display = "none";
        }
    });
});

document.addEventListener("DOMContentLoaded", function () {
    let finishButton = document.querySelector(".finish-button");
    let finishTestModal = document.getElementById("finishTestModal");
    let confirmFinish = document.getElementById("confirmFinish");
    let cancelFinish = document.getElementById("cancelFinish");
    let testResultModal = document.getElementById("testResultModal");
    let exitTest = document.getElementById("exitTest");

    let testStartTime = Date.now(); // ✅ Test boshlanish vaqtini saqlash

    finishButton.addEventListener("click", function (event) {
        event.preventDefault();
        finishTestModal.style.display = "flex";
    });

    cancelFinish.addEventListener("click", function () {
        finishTestModal.style.display = "none";
    });

    confirmFinish.addEventListener("click", function () {
        finishTestModal.style.display = "none"; // ❌ Modalni yopamiz
        testResultModal.style.display = "flex"; // ✅ Natija oynasini ochamiz
        checkTestResults(); // ✅ Natijalarni tekshirish
    });

    exitTest.addEventListener("click", function () {
        testResultModal.style.display = "none";
    });

    function checkTestResults() {
        let endTime = Date.now();
        let totalTime = Math.floor((endTime - testStartTime) / 1000);
        let minutes = Math.floor(totalTime / 60);
        let seconds = totalTime % 60;
        document.getElementById("spent-time").textContent = `${minutes}m ${seconds}s`;

        let selectedAnswers = [];
        let totalQuestions = document.querySelectorAll(".exam-card").length;

        document.querySelectorAll(".exam-card").forEach((questionBlock, index) => {
            let questionId = questionBlock.getAttribute("data-question-id");
            let selectedOption = questionBlock.querySelector("input[type='radio']:checked");
            if (selectedOption) {
                selectedAnswers.push({
                    question_id: parseInt(questionId),  // Savol ID si
                    answer_id: parseInt(selectedOption.value),  // Variant ID si
                    order_number: index + 1  // Tartib raqami (1 dan 90 gacha)
                });
            }
        });

        // ✅ Foydalanuvchining tanlagan javoblarini serverga yuborish
        fetch("/api/check-answers/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ answers: selectedAnswers, total_questions: totalQuestions })
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === "success") {
                document.getElementById("correct-answers").textContent = `${data.correct_count} / ${totalQuestions}`;
                document.getElementById("percentage").textContent = `${data.percentage}%`;
                document.getElementById("total-score").textContent = data.total_score;
                 console.log("Xondamir1", selectedSubjects.subject1)
                console.log("Xondamir2", selectedSubjects.subject2)
                document.getElementById("subject1-name").textContent = selectedSubjects.subject1 || "Fan 1";
                document.getElementById("subject2-name").textContent = selectedSubjects.subject2|| "Fan 2";
                document.getElementById("subject1-correct").textContent = `${data.subject_scores?.fan_1?.correct || 0} ta`;
                document.getElementById("subject2-correct").textContent = `${data.subject_scores?.fan_2?.correct || 0} ta`;
                document.getElementById("mandatory-correct").textContent = `${data.subject_scores?.mandatory?.correct || 0} ta`;

                document.getElementById("subject1-score").textContent = `${data.subject_scores?.fan_1?.score || 0} ball`;
                document.getElementById("subject2-score").textContent = `${data.subject_scores?.fan_2?.score || 0} ball`;
                document.getElementById("mandatory-score").textContent = `${data.subject_scores?.mandatory?.score || 0} ball`;

            } else {
                alert("Xatolik: " + data.message);
            }
        })
        .catch(error => {
            console.error("Xatolik:", error);
            alert("Natijalarni tekshirishda xatolik yuz berdi!");
        });
    }
});
