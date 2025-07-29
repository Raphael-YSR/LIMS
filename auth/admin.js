// auth/admin.js
document.addEventListener('DOMContentLoaded', () => {
    const addAdminForm = document.getElementById('addAdminForm');
    const messageDiv = document.getElementById('message');

    if (addAdminForm) {
        addAdminForm.addEventListener('submit', async (event) => {
            event.preventDefault(); // Prevent default form submission

            const firstName = document.getElementById('firstName').value;
            const lastName = document.getElementById('lastName').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            messageDiv.textContent = ''; // Clear previous messages
            messageDiv.className = 'mt-4 text-center'; // Reset class

            try {
                const response = await fetch('/auth/add-admin', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ firstName, lastName, email, password })
                });

                const data = await response.json();

                if (response.ok) {
                    messageDiv.textContent = data.message;
                    messageDiv.classList.add('text-green-400');
                    addAdminForm.reset(); // Clear the form
                } else {
                    messageDiv.textContent = data.message || 'Failed to add admin user.';
                    messageDiv.classList.add('text-red-400');
                }
            } catch (error) {
                console.error('Error:', error);
                messageDiv.textContent = 'An error occurred. Please try again.';
                messageDiv.classList.add('text-red-400');
            }
        });
    }
});
