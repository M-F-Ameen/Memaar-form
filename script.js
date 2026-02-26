document.addEventListener("DOMContentLoaded", function () {
  const choices = document.querySelectorAll(".choice");

  choices.forEach((choice) => {
    const radioInput = choice.querySelector('input[type="radio"]');

    // Store whether the choice is currently selected
    let wasChecked = radioInput.checked;

    choice.addEventListener("click", function (e) {
      const questionElement = this.closest(".q");
      const radioName = radioInput.name;

      // If this choice was already active
      if (this.classList.contains("active")) {
        // Toggle off
        this.classList.remove("active");
        radioInput.checked = false;
        questionElement.classList.remove("has-selection");
      } else {
        // Deselect all choices in group
        const allChoicesInGroup = document.querySelectorAll(
          `input[name="${radioName}"]`,
        );
        allChoicesInGroup.forEach((input) => {
          input.closest(".choice").classList.remove("active");
          input.checked = false;
        });

        // Activate this choice
        this.classList.add("active");
        radioInput.checked = true;
        questionElement.classList.add("has-selection");
      }

      // Prevent native radio button from re-checking itself
      e.preventDefault();
    });
  });
});
// test functionallity
// if(allChoices === null) {
//   console.log("No choices found")
// }
// Add this at the bottom of your existing script.js
document.getElementById("evalForm").addEventListener("submit", function (e) {
  e.preventDefault(); // Prevent actual form submission

  // Check if all required questions have been answered
  const requiredGroups = ["q1", "q2", "q3", "q4"];
  let allSelected = true;

  requiredGroups.forEach((name) => {
    const group = document.querySelectorAll(`input[name="${name}"]`);
    const checked = Array.from(group).some((radio) => radio.checked);
    const qDiv = document.querySelector(`.q[data-q="${name}"]`);
    if (!checked) {
      allSelected = false;
      qDiv.classList.add("error");
    } else {
      qDiv.classList.remove("error");
    }
  });

  if (!allSelected) {
    // Scroll to the first unanswered question
    const firstError = document.querySelector(".q.error");
    if (firstError) {
      firstError.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    // Do not show the success overlay if not all choices are selected
    return;
  }

  // Show the success overlay
  const overlay = document.getElementById("successOverlay");
  overlay.classList.add("active");

  // Hide the overlay after 3 seconds
  setTimeout(() => {
    overlay.classList.remove("active");
  }, 1000);

  // Submit form data to server
  const formData = new FormData(this);
  const data = Object.fromEntries(formData.entries());

  fetch("/api/evaluations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(data),
  })
    .then((response) => response.json())
    .then((result) => {
      console.log("Success:", result);
      // Reset the form after successful submission
      this.reset();
      // Remove all active classes and has-selection
      const allChoices = document.querySelectorAll(".choice");
      allChoices.forEach((choice) => choice.classList.remove("active"));
      const allQDivs = document.querySelectorAll(".q");
      allQDivs.forEach((q) => q.classList.remove("has-selection"));
    })
    .catch((error) => {
      console.error("Error:", error);
    });
});
