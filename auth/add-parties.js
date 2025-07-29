// auth/add-parties.js


document.addEventListener('DOMContentLoaded', () => {
    const addPartyForm = document.getElementById('addPartyForm');
    const messageDiv = document.getElementById('message');

    const tabAdmin = document.getElementById('tabAdmin');
    const tabIndividual = document.getElementById('tabIndividual');
    const tabOrganization = document.getElementById('tabOrganization');

    const individualFields = document.getElementById('individualFields');
    const organizationFields = document.getElementById('organizationFields');

    let currentPartyType = 'admin'; // Default mode

    // Function to update form visibility based on selected party type
    function updateFormVisibility() {
        // Hide all specific fields first
        individualFields.classList.remove('active');
        organizationFields.classList.remove('active');

        // Reset required attributes
        document.querySelectorAll('#individualFields input').forEach(input => input.removeAttribute('required'));
        document.querySelectorAll('#organizationFields input').forEach(input => input.removeAttribute('required'));

        // Activate fields based on currentPartyType
        if (currentPartyType === 'admin' || currentPartyType === 'individual') {
            individualFields.classList.add('active');
            document.getElementById('firstName').setAttribute('required', 'true');
            document.getElementById('lastName').setAttribute('required', 'true');
        } else if (currentPartyType === 'organization') {
            organizationFields.classList.add('active');
            document.getElementById('organizationName').setAttribute('required', 'true');
        }

        // Update active state of tab buttons
        tabAdmin.classList.remove('active');
        tabIndividual.classList.remove('active');
        tabOrganization.classList.remove('active');

        if (currentPartyType === 'admin') {
            tabAdmin.classList.add('active');
        } else if (currentPartyType === 'individual') {
            tabIndividual.classList.add('active');
        } else if (currentPartyType === 'organization') {
            tabOrganization.classList.add('active');
        }
    }

    // Event listeners for tab buttons
    tabAdmin.addEventListener('click', () => {
        currentPartyType = 'admin';
        updateFormVisibility();
    });

    tabIndividual.addEventListener('click', () => {
        currentPartyType = 'individual';
        updateFormVisibility();
    });

    tabOrganization.addEventListener('click', () => {
        currentPartyType = 'organization';
        updateFormVisibility();
    });

    // Initial form setup (default to Admin)
    updateFormVisibility();

    // Form submission handler
    if (addPartyForm) {
        addPartyForm.addEventListener('submit', async (event) => {
            event.preventDefault(); // Prevent default form submission

            messageDiv.textContent = ''; // Clear previous messages
            messageDiv.className = 'mt-4 text-center'; // Reset class

            const formData = {
                partyType: currentPartyType,
                email: document.getElementById('email').value,
                password: document.getElementById('password').value, // Password sent as plain text to backend for hashing
                kraPin: document.getElementById('kraPin').value || null, // Optional
                contactPhone: document.getElementById('contactPhone').value || null, // Optional
                address: document.getElementById('address').value || null // Optional
            };

            // Add specific fields based on party type
            if (currentPartyType === 'admin' || currentPartyType === 'individual') {
                formData.firstName = document.getElementById('firstName').value;
                formData.lastName = document.getElementById('lastName').value;
                if (currentPartyType === 'admin') {
                    formData.staffRole = 'admin'; // Specific role for admin
                }
            } else if (currentPartyType === 'organization') {
                formData.organizationName = document.getElementById('organizationName').value;
            }

            try {
                const response = await fetch('/auth/add-party', { // New generic endpoint
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(formData)
                });

                const data = await response.json();

                if (response.ok) {
                    messageDiv.textContent = data.message;
                    messageDiv.classList.add('text-green-400');
                    addPartyForm.reset(); // Clear the form
                    updateFormVisibility(); // Reset form to default view
                } else {
                    messageDiv.textContent = data.message || 'Failed to add party.';
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
