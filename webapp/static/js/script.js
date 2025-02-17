document.addEventListener("DOMContentLoaded", function () {
    let diagnostikaContainer = document.getElementById("diagnostika-list");
    let examContainer = document.getElementById("exam-container");
    let backButton = document.getElementById("back-to-list");

    fetch("/api/diagnostikas/")
        .then(response => response.json())
        .then(data => {
            diagnostikaContainer.innerHTML = ""; // Avvalgi ma'lumotlarni tozalash

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

                // Test topshirish tugmalariga hodisani bog'lash
                document.querySelectorAll(".start-button").forEach(button => {
                    button.addEventListener("click", function () {
                        diagnostikaContainer.classList.add("hidden");  // Diagnostika ro‘yxatini yashirish
                        examContainer.classList.remove("hidden");  // Imtihon oynasini chiqarish
                    });
                });
            }
        })
        .catch(error => {
            console.error("Error:", error);
            diagnostikaContainer.innerHTML = "<p class='error-message'>❌ Ma'lumotlarni yuklashda xatolik yuz berdi.</p>";
        });

    // Ortga qaytish tugmasi
    backButton.addEventListener("click", function () {
        examContainer.classList.add("hidden");  // Imtihon oynasini yashirish
        diagnostikaContainer.classList.remove("hidden");  // Diagnostika ro‘yxatini qayta ko‘rsatish
    });
});

document.addEventListener("DOMContentLoaded", function () {
    fetchSubjects();
});

const subjectsMapping = {
    "Matematika": ["Fizika", "Geografiya", "Chet tili", "Ona tili va adabiyot", "Kasbiy (ijodiy) imtihon"],
    "Fizika": ["Matematika", "Chet tili"],
    "Chet tili": ["Ona tili va adabiyot"],
    "Kimyo": ["Matematika", "Biologiya", "Ingliz tili"],
    "Biologiya": ["Kimyo", "Ona tili va adabiyot"],
    "Tarix": ["Matematika", "Geografiya", "Chet tili", "Ona tili va adabiyot", "Kasbiy (ijodiy) imtihon"],
    "Geografiya": ["Matematika"],
    "O’zbek tili va adabiyot": ["Chet tili"],
    "Rus tili va adabiyot": ["Tarix", "Chet tili", "Ona tili va adabiyot"],
    "Ingliz tili": ["Ona tili va adabiyot"],
    "Kasbiy (ijodiy) imtihon": ["Chet tili", "Ona tili va adabiyot"],
    "Ona tili va adabiyot": ["Matematika", "Chet tili"],
    "Huquq": ["Chet tili"]
};

// ✅ Chet tillari ro‘yxati
const foreignLanguages = ["Ingliz tili", "Nemis tili", "Fransuz tili"];

let allSubjects = [];

function fetchSubjects() {
    fetch("/api/subjects/")
        .then(response => response.json())
        .then(data => {
            if (data.status === "success") {
                allSubjects = data.subjects.map(subject => subject.name);
                let subject1Select = document.getElementById("subject1");
                let subject2Select = document.getElementById("subject2");
                let foreignLanguageContainer = document.getElementById("foreign-language-container");
                let foreignLanguageSelect = document.getElementById("foreign-language");

                subject1Select.innerHTML = `<option value="">1-Fanni tanlang</option>`;
                subject2Select.innerHTML = `<option value="">2-Fanni tanlang</option>`;
                foreignLanguageContainer.style.display = "none"; // **Avval yashirib turamiz**

                data.subjects.forEach(subject => {
                    let option = document.createElement("option");
                    option.value = subject.name;
                    option.textContent = subject.name;
                    subject1Select.appendChild(option);
                });

                subject1Select.addEventListener("change", function () {
                    updateSecondSubject();
                });

                subject2Select.addEventListener("change", function () {
                    checkForeignLanguage();
                });

                function updateSecondSubject() {
                    let selectedSubject = subject1Select.value;
                    subject2Select.innerHTML = `<option value="">2-Fanni tanlang</option>`;

                    if (subjectsMapping[selectedSubject] && subjectsMapping[selectedSubject].length > 0) {
                        subjectsMapping[selectedSubject].forEach(subjectName => {
                            if (allSubjects.includes(subjectName)) {
                                let option = document.createElement("option");
                                option.value = subjectName;
                                option.textContent = subjectName;
                                subject2Select.appendChild(option);
                            }
                        });

                        if (subject2Select.options.length === 1) {
                            subject2Select.innerHTML = `<option value="">Mos fan yo‘q</option>`;
                        }
                    } else {
                        subject2Select.innerHTML = `<option value="">Mos fan yo‘q</option>`;
                    }

                    checkForeignLanguage();
                }

                function checkForeignLanguage() {
                    let subject1 = subject1Select.value;
                    let subject2 = subject2Select.value;

                    if (subject1 === "Chet tili" || subject2 === "Chet tili") {
                        foreignLanguageContainer.style.display = "block";
                        foreignLanguageSelect.innerHTML = "";
                        foreignLanguages.forEach(lang => {
                            let option = document.createElement("option");
                            option.value = lang;
                            option.textContent = lang;
                            foreignLanguageSelect.appendChild(option);
                        });
                    } else {
                        foreignLanguageContainer.style.display = "none";
                    }
                }
            }
        })
        .catch(error => {
            console.error("Fanlarni yuklashda xatolik:", error);
        });
}

