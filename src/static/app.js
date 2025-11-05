document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Helper: build initials from an email or name-like string
  function initialsFromString(s) {
    if (!s) return "";
    const local = s.split("@")[0];
    const parts = local.split(/[\.\-_ ]+/).filter(Boolean);
    const initials = parts.length === 0 ? local.slice(0, 2) : (parts[0][0] + (parts[1]?.[0] || (parts[0][1] || "")));
    return initials.toUpperCase().slice(0, 2);
  }

  // Function to clear and repopulate activities and the select dropdown
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading / existing content
      activitiesList.innerHTML = "";
      // Preserve the first placeholder option, remove others
      for (let i = activitySelect.options.length - 1; i >= 0; i--) {
        if (i !== 0) activitySelect.remove(i);
      }

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";
        activityCard.dataset.activityId = name;

        const spotsLeft = details.max_participants - (details.participants?.length || 0);

        // Basic info
        const title = document.createElement("h4");
        title.textContent = name;
        const desc = document.createElement("p");
        desc.textContent = details.description || "";
        const schedule = document.createElement("p");
        schedule.innerHTML = `<strong>Schedule:</strong> ${details.schedule || "TBD"}`;
        const availability = document.createElement("p");
        availability.innerHTML = `<strong>Availability:</strong> ${spotsLeft} spots left`;

        activityCard.appendChild(title);
        activityCard.appendChild(desc);
        activityCard.appendChild(schedule);
        activityCard.appendChild(availability);

        // Participants section
        const participantsDiv = document.createElement("div");
        participantsDiv.className = "participants";
        const participantsHeader = document.createElement("h5");
        participantsHeader.textContent = "Participants";
        participantsDiv.appendChild(participantsHeader);

        const participants = details.participants || [];
        if (participants.length === 0) {
          const emptyP = document.createElement("p");
          emptyP.className = "empty";
          emptyP.textContent = "No participants yet";
          participantsDiv.appendChild(emptyP);
        } else {
          const ul = document.createElement("ul");
          participants.forEach((p) => {
            const li = document.createElement("li");

            const avatar = document.createElement("span");
            avatar.className = "participant-avatar";
            avatar.textContent = initialsFromString(p);

            // Name container so we can ellipsize if needed
            const nameSpan = document.createElement("span");
            nameSpan.className = "participant-name";
            nameSpan.textContent = p;

            // Delete button
            const deleteBtn = document.createElement("button");
            deleteBtn.className = "delete-participant";
            deleteBtn.title = "Remove participant";
            deleteBtn.setAttribute("aria-label", `Remove ${p}`);
            deleteBtn.textContent = "✕";

            // Handle delete click
            deleteBtn.addEventListener("click", async (e) => {
              e.stopPropagation();
              try {
                const resp = await fetch(
                  `/activities/${encodeURIComponent(name)}/unregister?email=${encodeURIComponent(p)}`,
                  { method: "POST" }
                );

                const resJson = await resp.json();
                if (resp.ok) {
                  messageDiv.textContent = resJson.message;
                  messageDiv.className = "message success";
                  messageDiv.classList.remove("hidden");
                  // Refresh activities so participants and availability update
                  fetchActivities();
                } else {
                  messageDiv.textContent = resJson.detail || "Unable to remove participant";
                  messageDiv.className = "message error";
                  messageDiv.classList.remove("hidden");
                }

                setTimeout(() => {
                  messageDiv.classList.add("hidden");
                }, 5000);
              } catch (err) {
                console.error("Error removing participant:", err);
                messageDiv.textContent = "Failed to remove participant. Please try again.";
                messageDiv.className = "message error";
                messageDiv.classList.remove("hidden");
              }
            });

            li.appendChild(avatar);
            li.appendChild(nameSpan);
            li.appendChild(deleteBtn);
            ul.appendChild(li);
          });
          participantsDiv.appendChild(ul);
        }

        activityCard.appendChild(participantsDiv);
        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "message success";
        signupForm.reset();

        // Refresh activities so participants and availability update
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "message error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "message error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
