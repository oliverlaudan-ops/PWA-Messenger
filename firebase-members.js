// ============================================
// GROUP MEMBERS FUNCTIONS
// ============================================
// Add this to the end of firebase.js

// Show Group Members Modal
window.showGroupMembers = async () => {
  if (!currentGroup) return;
  
  const modal = document.getElementById('groupMembersModal');
  modal.classList.remove('hidden');
  
  const membersList = document.getElementById('membersList');
  membersList.innerHTML = '<div class="spinner"></div>';
  
  try {
    const groupDoc = await getDoc(doc(db, 'groups', currentGroup.groupId));
    
    if (!groupDoc.exists()) {
      membersList.innerHTML = '<div class="no-users">Gruppe nicht gefunden</div>';
      return;
    }
    
    const groupData = groupDoc.data();
    const members = groupData.members || [];
    const admins = groupData.admins || [];
    const creatorId = groupData.createdBy;
    
    if (members.length === 0) {
      membersList.innerHTML = '<div class="no-users">Keine Mitglieder</div>';
      return;
    }
    
    // Update member count
    document.getElementById('membersCountText').textContent = 
      `${members.length} ${members.length === 1 ? 'Mitglied' : 'Mitglieder'}`;
    
    membersList.innerHTML = '';
    
    // Load all member data
    for (const memberId of members) {
      const memberData = await loadUserData(memberId);
      
      if (memberData) {
        const memberItem = document.createElement('div');
        memberItem.className = 'user-item no-hover';
        
        const avatar = document.createElement('div');
        avatar.className = 'user-avatar';
        avatar.textContent = memberData.username.charAt(0).toUpperCase();
        
        const details = document.createElement('div');
        details.className = 'user-details';
        
        const usernameContainer = document.createElement('div');
        usernameContainer.style.display = 'flex';
        usernameContainer.style.alignItems = 'center';
        usernameContainer.style.flexWrap = 'wrap';
        usernameContainer.style.gap = '4px';
        
        const username = document.createElement('span');
        username.className = 'user-username';
        username.textContent = `@${memberData.username}`;
        usernameContainer.appendChild(username);
        
        // Add Creator badge
        if (memberId === creatorId) {
          const creatorBadge = document.createElement('span');
          creatorBadge.className = 'role-badge creator';
          creatorBadge.textContent = '👑 Creator';
          usernameContainer.appendChild(creatorBadge);
        }
        
        // Add Admin badge
        if (admins.includes(memberId) && memberId !== creatorId) {
          const adminBadge = document.createElement('span');
          adminBadge.className = 'role-badge admin';
          adminBadge.textContent = '⚡ Admin';
          usernameContainer.appendChild(adminBadge);
        }
        
        const email = document.createElement('div');
        email.className = 'user-email';
        email.textContent = memberData.email || '';
        
        details.appendChild(usernameContainer);
        details.appendChild(email);
        memberItem.appendChild(avatar);
        memberItem.appendChild(details);
        membersList.appendChild(memberItem);
      }
    }
  } catch (e) {
    console.error('Error loading group members:', e);
    membersList.innerHTML = '<div class="no-users">Fehler beim Laden der Mitglieder</div>';
  }
};

// Close Group Members Modal
window.closeGroupMembers = () => {
  document.getElementById('groupMembersModal').classList.add('hidden');
};
