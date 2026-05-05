const messagesBox = document.querySelector('.messages-box');
const sendMsgBtn = document.querySelector('.send-msg-btn');
const msgInput = document.querySelector('.msg-input');

const sendMessage = (e) => {
    e.preventDefault();

    const msg = msgInput.value;
    addMsg('out', msg);
}

function addMsg(side, msg) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `msg-div ${side}`;
    console.log(msg)
    msgDiv.textContent = msg;
    messagesBox.appendChild(msgDiv)
}

if (sendMsgBtn){
    sendMsgBtn.addEventListener('click', sendMessage)
}

