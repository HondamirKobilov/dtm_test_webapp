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
let allQuestionIds = {};

document.addEventListener("DOMContentLoaded", function () {
   let diagnostikaContainer = document.getElementById("diagnostika-list");
   let examContainer = document.getElementById("exam-container");
   let resultsContainer = document.getElementById("resultsContainer");
   let resultsTitle = document.getElementById("resultsTitle");
   let resultsBody = document.getElementById("resultsBody");
   let backToList = document.getElementById("backToList");
   let backmenu = document.getElementById("backmenu");
   let startExamButton = document.querySelector(".start-button1");
   let questionsDiv = document.getElementById("questions");
   let testContainer = document.getElementById("test-container");
   let backToHomeBottom = document.getElementById("backToHomeBottom");

   const frontHost = "https://2c68-185-139-138-219.ngrok-free.app"
   // const tg = window.Telegram.WebApp;
   // tg.ready();
   // const userId = tg.initDataUnsafe.user.id;

   let userId = 1405814595;
    // ✅ Diagnostikalar ro‘yxatini yuklash
    console.log("UserID>>>", userId)
    fetch(`/api/diagnostikas/`)
        .then(response => response.json())
        .then(async data => {
            diagnostikaContainer.innerHTML = "";
            if (data.diagnostikalar.length === 0) {
                console.log("salomim")
                diagnostikaContainer.innerHTML = "<p class='empty-message'>📌 Hozircha diagnostikalar mavjud emas.</p>";
                return;
            }
            let diagnostikaPromises = data.diagnostikalar.map(diagnostika =>
                Promise.all([
                    fetch(`${frontHost}/api/check-user-result/?user_id=${userId}&diagnostika_id=${diagnostika.id}`)
                        .then(response => response.json()),
                    fetch(`${frontHost}/api/diagnostika-users-count/?diagnostika_id=${diagnostika.id}`)
                        .then(response => response.json())
                ]).then(([resultData, usersData]) => ({
                    ...diagnostika,
                    hasResult: resultData.exists,
                    users_count: usersData.users_count,
                    status: resultData.status
                }))
            );
            let diagnostikaList = await Promise.all(diagnostikaPromises);

            // ✅ Diagnostikalarni ID bo‘yicha **tartiblash**
            diagnostikaList.sort((a, b) => b.id - a.id);

            diagnostikaList.forEach(diagnostika => {
                // let buttonText = diagnostika.hasResult ? "Natijalar" : "Test topshirish";
                let buttonText;
                console.log()
                if (!diagnostika.status || diagnostika.hasResult) {
                    buttonText = "Natijalar"; // 🔹 Diagnostika tugagan yoki user qatnashgan
                } else {
                    buttonText = "Test topshirish"; // 🔹 Diagnostika aktiv va user qatnashmagan
                }
                let examCard = document.createElement("div");
                examCard.className = "exam-carta";
                examCard.innerHTML = `
                    <h3>${diagnostika.name}</h3>
                    <p class="exam-info">
                        <span class="exam-date">📅 ${diagnostika.created_at}</span> 
                        <span class="divider">/</span> 
                        <span class="exam-stats">👥 <strong>${diagnostika.users_count}</strong> ta abituriyent</span>
                    </p>
                    <button class="start-button" data-status="${diagnostika.status}" data-id="${diagnostika.id}" data-result="${diagnostika.hasResult} ">
                        ${buttonText}
                    </button>
                `;
                diagnostikaContainer.appendChild(examCard);
            });


            // ✅ Tugmalarni faollashtirish
            document.addEventListener("click", function (event) {
                let clickedElement = event.target; // Bosilgan elementni aniqlaymiz

                // 🟢 Agar `.start-button` bosilgan bo‘lsa
                if (clickedElement.classList.contains("start-button")) {
                    let hasResult = clickedElement.getAttribute("data-result").trim() === "true";
                    let diagnostikaId = clickedElement.getAttribute("data-id"); // ✅ Diagnostika ID ni olish
                    let isActive = clickedElement.getAttribute("data-status").trim() === "true";
                    localStorage.setItem("diagnostika_id", diagnostikaId);
                    if (hasResult || !isActive) {
                        if (!isActive && hasResult) {
                            document.getElementById("extraButton").style.display = "block";
                        }
                        diagnostikaContainer.classList.add("hidden");
                        resultsContainer.classList.remove("hidden");
                        loadResults(diagnostikaId);
                    } else {
                        diagnostikaContainer.classList.add("hidden");
                        examContainer.classList.remove("hidden");
                    }
                }
                else if (clickedElement.id === "results_end") {
                    diagnostikaContainer.classList.add("hidden");
                    resultsContainer.classList.remove("hidden");
                    let diagnostikaId = localStorage.getItem("diagnostika_id");
                    loadResults(diagnostikaId);
                }
            });
        })
        .catch(error => {
            console.error("Error:", error);
            diagnostikaContainer.innerHTML = "<p class='error-message'>❌ Ma'lumotlarni yuklashda xatolik yuz berdi.</p>";
        });
    // ✅ Natijalarni yuklash funksiyasi
    async function loadResults(diagnostikaId) {
        try {
            let response = await fetch(`${frontHost}/api/results/?diagnostika_id=${diagnostikaId}`);
            let data = await response.json();
            console.log("✅ API dan kelgan natijalar:", data);
            console.log(data.results.length)
            if (data.results.length === 0) {
                resultsBody.innerHTML = "<p>[null]</p>"
            }
            else {
                resultsTitle.textContent = `Diagnostik imtihon #${diagnostikaId}`;
                allResults = data.results;
                populateSubjects(allResults);
                renderResults(allResults);
            }


        } catch (error) {
            console.error("Xatolik:", error);
        }
    }
    function populateSubjects(results) {
        let subjects1 = new Set();
        let subjects2 = new Set();

        results.forEach(result => {
            subjects1.add(result.subject1_name);
            subjects2.add(result.subject2_name);
        });

        filterSubject1.innerHTML = `<option value="">Barcha fanlar</option>`;
        filterSubject2.innerHTML = `<option value="">Barcha fanlar</option>`;

        subjects1.forEach(subject => {
            filterSubject1.innerHTML += `<option value="${subject}">${subject}</option>`;
        });

        subjects2.forEach(subject => {
            filterSubject2.innerHTML += `<option value="${subject}">${subject}</option>`;
        });

        filterSubject1.addEventListener("change", filterResults);
        filterSubject2.addEventListener("change", filterResults);
    }

// ✅ Natijalarni chiqarish
    function renderResults(filteredResults) {
        resultsBody.innerHTML = "";

        filteredResults.sort((a, b) => {
            let totalA = a.subject1_score * 3.1 + a.subject2_score * 2.1 + a.mandatory_score * 1.1;
            let totalB = b.subject1_score * 3.1 + b.subject2_score * 2.1 + b.mandatory_score * 1.1;
            return totalB - totalA;
        });

        filteredResults.forEach((result, index) => {
            let totalScore = (result.subject1_score * 3.1 + result.subject2_score * 2.1 + result.mandatory_score * 1.1).toFixed(2);
            let percentage = ((totalScore / 200) * 100).toFixed(1);
            let formattedDate = formatResultDate(result.completed_at);
            function formatPhoneNumber(phoneNumber) {
                // Raqamni tekshirish: Agar +99 bilan boshlansa va uzunligi to'g'ri bo'lsa, formatlash amalga oshiriladi.
                if (phoneNumber.startsWith('+99') && phoneNumber.length >= 7) {
                    // Raqamning birinchi uchta raqami, o'rtasidagi yulduzchalar va oxirgi to'rtta raqamni qaytaradi
                    return phoneNumber.slice(0, 3) + '***' + phoneNumber.slice(-4);
                }
                return phoneNumber; // Agar format talablarga javob bermasa, asl raqamni qaytaradi.
            }

            let row = `<tr>
                <td><strong>${index + 1}-o‘rin</strong></  td>
                <td>${formatPhoneNumber(result.participant)}<br>
                    <span class="participant-name">${result.full_name}</span>
                </td>
                <td class="mobile-hide">${result.subject1_score} / ${(result.subject1_score * 3.1).toFixed(2)}<br>
                    <span class="subject-name">${result.subject1_name}</span>
                </td>
                <td class="mobile-hide">${result.subject2_score} / ${(result.subject2_score * 2.1).toFixed(2)}<br>
                    <span class="subject-name">${result.subject2_name}</span>
                </td>
                <td class="mobile-hide">${result.mandatory_score} / ${(result.mandatory_score * 1.1).toFixed(2)}<br>
                    <span class="subject-name">Majburiy</span>
                </td>
                <td>${totalScore} / ${percentage}%</td>
                <td>${formattedDate}</td>
            </tr>`;

            resultsBody.innerHTML += row;
        });
    }


// ✅ Natijalarni filterlash
    function filterResults() {
        let selectedSubject1 = filterSubject1.value;
        let selectedSubject2 = filterSubject2.value;

        let filteredResults = allResults.filter(result =>
            (selectedSubject1 === "" || result.subject1_name === selectedSubject1) &&
            (selectedSubject2 === "" || result.subject2_name === selectedSubject2)
        );

        renderResults(filteredResults);
    }

    function formatResultDate(datetime) {
        let parts = datetime.split(" ");
        if (parts.length !== 2) {
            console.error("❌ Xato! Sana noto‘g‘ri:", datetime);
            return "Noto‘g‘ri sana";
        }
        return `${parts[0]}<br>${parts[1]}`;
    }

    backToList.addEventListener("click", function () {
        resultsContainer.classList.add("hidden");
        diagnostikaContainer.classList.remove("hidden");
        document.getElementById('subject1').selectedIndex = 0;
        document.getElementById('subject2').selectedIndex = 0;
        document.getElementById('foreign-language-container').style.display = 'none';
        document.getElementById('foreign-language').selectedIndex = 0;
    });

    backmenu.addEventListener("click", function () {
        examContainer.classList.add("hidden");
        diagnostikaContainer.classList.remove("hidden");
        document.getElementById('subject1').selectedIndex = 0;
        document.getElementById('subject2').selectedIndex = 0;
        document.getElementById('foreign-language-container').style.display = 'none';
        document.getElementById('foreign-language').selectedIndex = 0;
    });
    fetchSubjects();
    startExamButton.addEventListener("click", async function () {
        let subject1 = document.getElementById("subject1").value;
        let subject2 = document.getElementById("subject2").value;
        let foreignLanguage = document.getElementById("foreign-language").value;
        if (!subject1 || !subject2) {
            alert("Iltimos, ikkita mutaxassislik fanini tanlang!");
            return;
        }
        let diagnostikaId = localStorage.getItem("diagnostika_id");
        if (!diagnostikaId || diagnostikaId === "null") {
            alert("⚠️ Bu diaginostikaga test joylanmagan! Iltimos, boshqa diagnostikani tanlang.");
            return;
        }

        let checkSubjectsResponse = await fetch(`/api/check-diagnostika-subjects/?diagnostika_id=${diagnostikaId}`);
        let checkSubjectsData = await checkSubjectsResponse.json();

        // **Agar diagnostikaga bog‘langan fanlar mavjud bo‘lmasa**
        if (checkSubjectsData.subjects.length === 0) {
            alert("⚠️ Hali test joylanmagan!");
            return;
        }
        if (subject1 === "Chet tili") {
            subject1 = foreignLanguage;
        }

        // ✅ Agar Chet tili 2-fan bo‘lsa
        if (subject2 === "Chet tili") {
            subject2 = foreignLanguage;
        }
        let requestData = {
            subject1: subject1,
            subject2: subject2,
            diaginostika_id: diagnostikaId
        };
        selectedSubjects.subject1 = subject1;
        selectedSubjects.subject2 = subject2;
        selectedSubjects.diaginostika_id = diagnostikaId;

        let availableSubjects = checkSubjectsData.subjects.map(subject => subject.name);
        console.log("1-fan>>", subject1, "2-fan>>", subject2)
        if (!availableSubjects.includes(subject1) || !availableSubjects.includes(subject2)) {
            alert("⚠️ Bu fanlar bo‘yicha hali testlar joylanmagan!");
            return;
        }
        function shuffleArray(array) {
            for (let i = array.length - 1; i > 0; i--) {
                let j = Math.floor(Math.random() * (i + 1)); // 0 dan i gacha random indeks
                [array[i], array[j]] = [array[j], array[i]]; // Elementlarni joyini almashtiramiz
            }
            return array;
        }

        if (document.getElementById("foreign-language-container").style.display === "block" && foreignLanguage) {
            requestData.foreign_language = foreignLanguage;
        }

        fetch(`${frontHost}/api/diagnostikas/${diagnostikaId}/tests/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === "success") {
                console.log("aoasnasjnsajn")
                questionsDiv.innerHTML = "";
                let startNumber = 1;
                fetch(`${frontHost}/api/diagnostika-users-count/?diagnostika_id=${diagnostikaId}`)
                    .then(response => response.json()) // JSON formatiga o‘tkazish
                    .then(usersData => {
                        let participantCountElement = document.getElementById("participant-count");
                        if (participantCountElement) {
                            participantCountElement.textContent = usersData.users_count;
                        }
                    })
                    .catch(error => console.error("Xatolik:", error));
                data.questions.forEach(subjectData => {
                    let subjectTitle = document.createElement("h2");
                    subjectTitle.textContent = subjectData.subject_name;
                    subjectTitle.classList.add("exam-title");
                    questionsDiv.appendChild(subjectTitle);

                    let shuffledQuestions = shuffleArray(subjectData.questions); // ✅ Savollarni aralashtiramiz

                    shuffledQuestions.forEach((question) => {
                        let questionBlock = document.createElement("div");
                        questionBlock.className = "exam-card";
                        questionBlock.id = `q${startNumber}`;

                        let shuffledAnswers = shuffleArray(question.answers); // ✅ Variantlarni aralashtiramiz

                        // ✅ Savolga tegishli variantlarni saqlash
                        allQuestionIds[question.id] = shuffledAnswers.map(answer => answer.id);

                        questionBlock.innerHTML = `
                            <p><strong>${startNumber}.</strong> ${fixLatexFormulas(question.question_text)}</p> 
                            ${question.image ? `<img src="${question.image}" alt="Rasm" width="50%">` : ""}
                            <div class="answers">
                                ${shuffledAnswers.map(answer => `
                                    <label>
                                        <input type="radio" name="q${startNumber}" value="${answer.id}">
                                        ${fixLatexFormulas(answer.text)}
                                    </label>
                                `).join("")}
                            </div>
                        `;

                        questionsDiv.appendChild(questionBlock);
                        startNumber++;
                    });
                });
                document.querySelectorAll(".answers input[type='radio']").forEach(radio => {
                    radio.addEventListener("change", function () {
                        let questionNumber = this.name.replace("q", ""); // Masalan: q5 -> 5
                        let relatedButton = document.querySelector(`.test-nav-btn[data-question="q${questionNumber}"]`);

                        // **Avval barcha tugmalardan "selected" klassini olib tashlaymiz**
                        document.querySelectorAll(".test-nav-btn").forEach(btn => {
                            btn.classList.remove("selected");
                        });

                        if (relatedButton) {
                            relatedButton.classList.add("selected");
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
                alert("Qaysidir fanda hali test mavjud emas");
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
document.addEventListener("DOMContentLoaded", async function () {
    let startTime = 3 * 60 * 60; // ⏳ 3 soat (sekundlarda)
    let timerElement = document.getElementById("remaining-time");
    let stickyTimer = document.getElementById("sticky-timer");
    let participantElement = document.getElementById("participant-count");
    let testButtonsDiv = document.getElementById("test-buttons");
    let extraButton = document.getElementById("extraButton"); // ❗ Extra tugmani olish
    let startButton = document.querySelector(".start-button1");
    let timerActive = true; // Timer holatini tekshirish uchun
    let timerInterval; // Interval ID saqlash
    const frontHost = "https://2c68-185-139-138-219.ngrok-free.app"
    let diagnostikaId = localStorage.getItem("diagnostika_id");
   // const tg = window.Telegram.WebApp;
   // tg.ready();
   // const userId = tg.initDataUnsafe.user.id;

    let userId = 1405814595;
    function formatTime(seconds) {
        let hours = Math.floor(seconds / 3600);
        let minutes = Math.floor((seconds % 3600) / 60);
        let secs = seconds % 60;
        return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }

    function updateTimer() {
        if (timerActive && startTime > 0) {
            startTime -= 1;
            let formattedTime = formatTime(startTime);
            timerElement.textContent = formattedTime;
            console.log("pppp>>>>>>", formattedTime)
            stickyTimer.textContent = formattedTime; // ✅ Sticky taymer ham yangilanadi
        }
    }

    // **Taymerni har 1 sekundda ishlatish**
    function startTimer() {
        timerInterval = setInterval(updateTimer, 1000);
    }
    startButton.addEventListener("click", function () {
        startTimer();
    });
    console.log("odamlar nima deydi")
    let response = await fetch(`${frontHost}/api/test-analysis/?diagnostika_id=${diagnostikaId}&user_id=${userId}`);
    let data = await response.json();
    console.log("Kelgan data:", data);
    extraButton.addEventListener("click", function () {
        if (timerActive) {
            clearInterval(timerInterval); // ⏸ Timer to'xtatilad
            timerElement.textContent = data.duration_time;
            remainingTimeElement.textContent = data.duration_time;
            console.log(timeElement.textContent)
            timerActive = false;
        } else {
            startTimer(); // ▶️ Timer qayta ishga tushadi
            timerActive = true;
        }
    });

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
            button.classList.remove("selected");
        });

        document.querySelectorAll(".exam-card input[type='radio']:checked").forEach(radio => {
            let questionNumber = radio.name.replace("q", "");
            let relatedButton = document.querySelector(`.test-nav-btn[data-question="q${questionNumber}"]`);

            if (relatedButton) {
                relatedButton.classList.add("selected");
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
    let results_end = document.getElementById("results_end");
    let testContainer = document.getElementById("test-container");

    let testStartTime = Date.now(); // ✅ Test boshlanish vaqtini saqlash

    finishButton.addEventListener("click", function (event) {
        event.preventDefault();
        finishTestModal.style.display = "flex";
    });

    cancelFinish.addEventListener("click", function () {
        finishTestModal.style.display = "none";
    });

    confirmFinish.addEventListener("click", function () {
        finishTestModal.style.display = "none";
        testResultModal.style.display = "flex";
        checkTestResults();
    });

    exitTest.addEventListener("click", function () {
        testResultModal.style.display = "none";
    });
    results_end.addEventListener("click", function () {
        testResultModal.style.display = "none";
        testContainer.style.display = "none";
        location.reload();
    });

    function checkTestResults() {
        let endTime = Date.now();
        let totalTime = Math.floor((endTime - testStartTime) / 1000); // ✅ Sekundga o'tkazish
        let hours = Math.floor(totalTime / 3600); // ⏳ Soatlar
        let minutes = Math.floor((totalTime % 3600) / 60); // ⏳ Daqiqalar
        let seconds = totalTime % 60;
        let duration_time = document.getElementById("spent-time").textContent = `${hours}:${minutes}:${seconds}`;

        let selectedAnswers = [];
        let totalQuestions = document.querySelectorAll(".exam-card").length;

        document.querySelectorAll(".exam-card").forEach((questionBlock, index) => {
            // let questionId = questionBlock.getAttribute("data-question-id");
            let selectedOption = questionBlock.querySelector("input[type='radio']:checked");
            if (selectedOption) {
                selectedAnswers.push({
                    // question_id: parseInt(questionId),
                    answer_id: parseInt(selectedOption.value),
                    order_number: index + 1
                });
            }
        });

        // ✅ Telegram Web App orqali user_id olish
        // const frontHost = "https://b5ca-92-63-205-135.ngrok-free.app"
        // const tg = window.Telegram.WebApp;
        // tg.ready();
        // const userId = tg.initDataUnsafe.user.id;

        let userId = 1405814595;
        let diagnostikaId = selectedSubjects.diaginostika_id;
        console.log(diagnostikaId)
        // ✅ Foydalanuvchining natijalarini serverga yuborish
        fetch("/api/check-answers/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                user_id: userId,  // ✅ Telegram foydalanuvchi ID
                diagnostika_id: diagnostikaId,  // ✅ Diagnostika ID
                subject1_name: selectedSubjects.subject1 || "Fan 1",
                subject2_name: selectedSubjects.subject2 || "Fan 2",
                answers: selectedAnswers,
                total_questions: totalQuestions,
                allQuestionIds: allQuestionIds,
                duration_time: duration_time
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === "success") {
                document.getElementById("correct-answers").textContent = `${data.correct_count} / ${totalQuestions}`;
                document.getElementById("percentage").textContent = `${data.percentage}%`;
                document.getElementById("total-score").textContent = data.total_score;
                document.getElementById("subject1-name").textContent = data.subject1_name;
                document.getElementById("subject2-name").textContent = data.subject2_name;
                // document.getElementById("mandatory-name").textContent = "Majburiy fanlar";
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

document.addEventListener("DOMContentLoaded", function () {
    let testResultModal = document.getElementById("testResultModal");
    let exitTest = document.getElementById("exitTest");
    let diagnostikaContainer = document.getElementById("diagnostika-list"); // 📌 Diagnostika tanlash menyusi
    let examContainer = document.getElementById("exam-container"); // 📌 Fan tanlash sahifasi
    let testContainer = document.getElementById("test-container"); // 📌 Test sahifasi
    let questionsDiv = document.getElementById("questions");
    function closeTestResults() {
        // ✅ Natijalar oynasini yopish
        testResultModal.style.display = "none";

        // ✅ Test sahifasini va fan tanlash menyusini yashirish
        testContainer.classList.add("hidden");
        examContainer.classList.add("hidden");
        // ✅ Diagnostika tanlash menyusini qayta ko‘rsatish
        diagnostikaContainer.classList.remove("hidden");
        questionsDiv.innerHTML = "";
        location.reload();
    }
    document.getElementById("exitTest").addEventListener("click", closeTestResults);

});
document.getElementById("extraButton").addEventListener("click", async function () {
    let diagnostikaId = localStorage.getItem("diagnostika_id");
    let examContainer = document.getElementById("exam-container");
    let testContainer = document.getElementById("test-container");
    let testButtonsDiv = document.getElementById("test-buttons"); // ✅ Tugmalar div
    let backToHomeBottom = document.getElementById("backToHomeBottom"); // ✅ Tugmalar div
    backToHomeBottom.classList.remove("hidden");
    document.querySelector(".finish-button").style.display = "none";
    const frontHost = "https://6e07-185-139-138-143.ngrok-free.app";

    let userId = 1405814595;
    // const frontHost = "https://ffcf-185-139-138-139.ngrok-free.app"

        // const tg = window.Telegram.WebApp;
        // tg.ready();
        // const userId = tg.initDataUnsafe.user.id;
    if (!diagnostikaId || !userId) {
        alert("⚠️ Foydalanuvchi yoki diagnostika aniqlanmadi!");
        return;
    }

    try {
        let response = await fetch(`${frontHost}/api/test-analysis/?diagnostika_id=${diagnostikaId}&user_id=${userId}`);

        if (!response.ok) {
            console.error(`❌ Server xatosi: ${response.status} - ${response.statusText}`);
            alert("⚠️ Natijalarni yuklashda xatolik!");
            return;
        }
        let data = await response.json();
        console.log("📌 API dan kelgan test tahlili:", data);

        if (!data.test_analysis || data.test_analysis.length === 0) {
            console.error("❌ API noto‘g‘ri formatda ma'lumot qaytardi!");
            alert("⚠️ Test natijalari topilmadi!");
            return;
        }

        document.getElementById("resultsContainer").classList.add("hidden");
        document.getElementById("exam-container").classList.add("hidden");
        document.getElementById("test-container").classList.remove("hidden");



        let participantElement = document.getElementById("participant-count");
        if (participantElement) {
            participantElement.textContent = data.participant_count;
        }

        let questionsDiv = document.getElementById("questions");
        if (!questionsDiv) {
            console.error("❌ Xatolik: `questions` div topilmadi!");
            return;
        }

        questionsDiv.innerHTML = "";
        testButtonsDiv.innerHTML = "";

        const subjects = [
            data.subject1_name,
            data.subject2_name,
            "Ona tili va adabiyot",
            "Tarix",
            "Matematika"
        ];

        let startNumber = 1;
        let currentSubjectIndex = 0;

        data.test_analysis.forEach((question, index) => {
            if (!question.answers || question.answers.length === 0) {
                console.warn(`❌ ${question.question_id} ID lik savol variantlarsiz kelgan!`);
                return;
            }

            if (index === 0 || index === 30 || index === 60 || index === 70 || index === 80) {
                let subjectTitle = document.createElement("h2");
                subjectTitle.textContent = subjects[currentSubjectIndex];
                subjectTitle.classList.add("exam-title");
                questionsDiv.appendChild(subjectTitle);
                currentSubjectIndex++;
            }

            let questionBlock = document.createElement("div");
            questionBlock.className = "exam-card";
            questionBlock.id = `q${startNumber}`; // 🟢 Har bir savolning ID si kiritildi

            let selectedAnswerId = question.user_answer_id;
            let correctAnswerId = question.correct_answer_id;

            let buttonClass = "";
            if (selectedAnswerId === correctAnswerId) {
                buttonClass = "correct-btn"; // ✅ To‘g‘ri javob yashil
            } else if (selectedAnswerId !== null && selectedAnswerId !== correctAnswerId) {
                buttonClass = "wrong-btn"; // ❌ Noto‘g‘ri javob qizil
            } else {
                buttonClass = ""; // ⚪ Ishlanmagan rangsiz qoladi
            }

            let navButton = document.createElement("button");
            navButton.textContent = startNumber;
            navButton.className = `test-nav-btn ${buttonClass}`;
            navButton.dataset.questionId = `q${startNumber}`;

            testButtonsDiv.appendChild(navButton);

            // ✅ Tugmani bosganda mos testga o'tish funksiyasi 100% ishlaydi
            navButton.addEventListener("click", function () {
                let questionElement = document.getElementById(this.dataset.questionId);
                if (questionElement) {
                    questionElement.scrollIntoView({ behavior: "smooth", block: "center" });
                }
            });

            let answerHTML = question.answers.map(answer => {
                let isSelected = selectedAnswerId === answer.id;
                let isCorrect = correctAnswerId === answer.id;
                let icon = "";

                if (isSelected && isCorrect) {
                    icon = " ✅";
                } else if (isSelected && !isCorrect) {
                    icon = " ❌";
                }

                return `
                    <label>
                        <input type="radio" name="q${startNumber}" value="${answer.id}" ${isSelected ? "checked" : ""} disabled>
                        ${fixLatexFormulas(answer.text)} <strong>${icon}</strong>
                    </label>
                `;
            }).join("");

            questionBlock.innerHTML = `
                <p><strong>${startNumber}.</strong> ${fixLatexFormulas(question.question_text)}</p> 
                ${question.image ? `<img src="${question.image}" alt="Rasm" width="50%">` : ""}
                <div class="answers">
                    ${answerHTML}
                </div>
            `;
            questionsDiv.appendChild(questionBlock);
            startNumber++;
        });

        MathJax.typesetPromise().then(() => {
            console.log("✅ MathJax formulalarni yangiladi");
        }).catch((err) => console.error("❌ MathJax xatolik berdi:", err));

    } catch (error) {
        console.error("❌ Xatolik:", error);
        alert("⚠️ Server bilan bog‘lanishda muammo!");
    }
});

document.getElementById("backToHomeBottom").addEventListener("click", function () {
    location.reload();
});


