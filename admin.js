/**
 * BEATFORGE - Admin Panel Logic (Firebase Firestore)
 */

document.addEventListener('DOMContentLoaded', () => {
    loadUsers();
    loadCustomSounds();

    const addSoundForm = document.getElementById('addSoundForm');
    if (addSoundForm) {
        addSoundForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('soundName').value.trim();
            const fileInput = document.getElementById('soundFile');
            
            if (fileInput.files.length === 0) return;
            const file = fileInput.files[0];
            
            if (file.size > 2 * 1024 * 1024) {
                alert('Dosya çok büyük! Lütfen 2MB altı bir dosya yükleyin.');
                return;
            }

            const reader = new FileReader();
            reader.onload = async function(evt) {
                const dataURL = evt.target.result;
                const sound = {
                    id: 'sound_' + Date.now(),
                    name: name,
                    type: 'file',
                    dataURL: dataURL,
                    addedBy: getCurrentUser().username
                };
                
                try {
                    await saveCustomSound(sound);
                    document.getElementById('soundName').value = '';
                    fileInput.value = '';
                    loadCustomSounds();
                    alert('Yeni ses dosyası başarıyla eklendi!');
                } catch (err) {
                    console.error('Ses ekleme hatası:', err);
                    alert('Hata! Ses dosyası eklenirken bir sorun oluştu. Daha küçük bir dosya deneyin.');
                }
            };
            reader.readAsDataURL(file);
        });
    }
});

async function loadUsers() {
    try {
        const users = await getAllUsers();
        const beats = await getAllBeats();
        const tbody = document.getElementById('usersList');
        tbody.innerHTML = '';
        
        users.forEach(user => {
            const userBeatsCount = beats.filter(b => b.username === user.username).length;
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${user.username}</td>
                <td><span class="badge ${user.role}">${user.role}</span></td>
                <td>${userBeatsCount}</td>
                <td>
                    ${user.role !== 'admin' ? `<button class="btn-danger btn-sm" onclick="deleteUser('${user.username}')">Sil</button>` : '-'}
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error('Kullanıcılar yüklenirken hata:', err);
    }
}

async function deleteUser(username) {
    if (confirm(`${username} adlı kullanıcıyı silmek istediğinize emin misiniz?`)) {
        try {
            await deleteUserFromDB(username);
            loadUsers();
        } catch (err) {
            console.error('Kullanıcı silme hatası:', err);
            alert('Kullanıcı silinirken bir hata oluştu!');
        }
    }
}

async function loadCustomSounds() {
    try {
        const customSounds = await getCustomSounds();
        const list = document.getElementById('customSoundsList');
        list.innerHTML = '';
        
        customSounds.forEach(sound => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span>${sound.name} (${sound.type})</span>
                <button class="btn-danger btn-sm" onclick="deleteSound('${sound.id}')">Sil</button>
            `;
            list.appendChild(li);
        });
    } catch (err) {
        console.error('Sesler yüklenirken hata:', err);
    }
}

async function deleteSound(id) {
    if (confirm(`Bu sesi silmek istediğinize emin misiniz?`)) {
        try {
            await deleteCustomSoundFromDB(id);
            loadCustomSounds();
        } catch (err) {
            console.error('Ses silme hatası:', err);
            alert('Ses silinirken bir hata oluştu!');
        }
    }
}
