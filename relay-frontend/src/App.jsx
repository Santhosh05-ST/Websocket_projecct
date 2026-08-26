import { useState, useRef, useEffect, useCallback } from "react";
import SockJS from "sockjs-client";
import Stomp from "stompjs";
import { Mic, MicOff, Video, VideoOff, Copy, Send, Users, MessageSquare, Circle, PhoneOff, ShieldCheck, KeyRound } from "lucide-react";

const ICE_SERVERS = [{ urls: "stun:stun.l.google.com:19302" }];

function fmtTime(iso) {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export default function App() {
  // ---------- top-level state ----------
  const [serverUrl, setServerUrl] = useState("https://websocket-projecct-1.onrender.com");
  const [screen, setScreen] = useState("auth"); // auth | 2fa_verify | dashboard | room | oauth_processing
  const [authTab, setAuthTab] = useState("login");

  const [token, setToken] = useState(null);
  const [tempToken, setTempToken] = useState(null); // Temporary token for 2FA challenge
  const [user, setUser] = useState(null);
  const [room, setRoom] = useState(null);

  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [regForm, setRegForm] = useState({ username: "", email: "", password: "" });
  const [twoFactorCode, setTwoFactorCode] = useState("");
  
  const [loginMsg, setLoginMsg] = useState({ text: "", ok: false });
  const [regMsg, setRegMsg] = useState({ text: "", ok: false });
  const [twoFactorMsg, setTwoFactorMsg] = useState({ text: "", ok: false });
  
  const [loginBusy, setLoginBusy] = useState(false);
  const [regBusy, setRegBusy] = useState(false);
  const [twoFactorBusy, setTwoFactorBusy] = useState(false);

  const [joinCode, setJoinCode] = useState("");
  const [dashMsg, setDashMsg] = useState("");

  const [connStatus, setConnStatus] = useState("not connected");
  const [participants, setParticipants] = useState([]);
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [sidebarTab, setSidebarTab] = useState("chat");
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [remoteUsers, setRemoteUsers] = useState([]);
  const [toasts, setToasts] = useState([]);

  // 2FA Setup state
  const [twoFactorSetupData, setTwoFactorSetupData] = useState(null);

  // ---------- refs ----------
  const tokenRef = useRef(null);
  const userRef = useRef(null);
  const roomRef = useRef(null);
  const stompRef = useRef(null);
  const subsRef = useRef([]);
  const localStreamRef = useRef(null);
  const localVideoRef = useRef(null);
  const peersRef = useRef(new Map());
  const remoteVideoRefs = useRef(new Map());
  const chatLogRef = useRef(null);

  useEffect(() => { tokenRef.current = token; }, [token]);
  useEffect(() => { userRef.current = user; }, [user]);
  useEffect(() => { roomRef.current = room; }, [room]);

  useEffect(() => {
    if (chatLogRef.current) chatLogRef.current.scrollTop = chatLogRef.current.scrollHeight;
  }, [messages]);

  function pushToast(text, isErr) {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, text, isErr: !!isErr }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }

  // ---------- API helper ----------
  const api = useCallback(
    async (path, { method = "GET", body, auth = true, overrideToken } = {}) => {
      const headers = { "Content-Type": "application/json" };
      const authToken = overrideToken || tokenRef.current;
      if (auth && authToken) headers.Authorization = "Bearer " + authToken;
      let res;
      try {
        res = await fetch(serverUrl.replace(/\/$/, "") + path, {
          method,
          headers,
          body: body !== undefined ? JSON.stringify(body) : undefined,
        });
      } catch {
        throw new Error("Can't reach the server at " + serverUrl + ". Is it running, and does it allow this origin (CORS)?");
      }
      const contentType = res.headers.get("content-type") || "";
      const raw = contentType.includes("application/json") ? await res.json().catch(() => null) : await res.text();
      if (!res.ok) {
        const message = raw && raw.message ? raw.message : typeof raw === "string" && raw ? raw : "Request failed (" + res.status + ")";
        throw new Error(message);
      }
      return raw;
    },
    [serverUrl]
  );

  // ---------- OAuth Redirect Interceptor ----------
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthToken = params.get("token");
    const requires2FA = params.get("requires2FA") === "true";

    if (oauthToken) {
      window.history.replaceState({}, document.title, window.location.pathname);
      
      if (requires2FA) {
        setTempToken(oauthToken);
        setScreen("2fa_verify");
      } else {
        setScreen("oauth_processing");
        tokenRef.current = oauthToken;
        setToken(oauthToken);

        api("/users/me")
          .then((me) => {
            setUser(me);
            setScreen("dashboard");
            pushToast("Welcome, " + me.username + ".");
          })
          .catch((err) => {
            setScreen("auth");
            setLoginMsg({ text: "OAuth Login Failed: " + err.message, ok: false });
          });
      }
    }
  }, [api]);

  // ---------- auth ----------
  async function handleRegister(e) {
    e.preventDefault();
    setRegMsg({ text: "", ok: false });
    setRegBusy(true);
    try {
      await api("/auth/register", { method: "POST", auth: false, body: regForm });
      setRegMsg({ text: "Account created — you can log in now.", ok: true });
      setLoginForm((f) => ({ ...f, email: regForm.email }));
      setAuthTab("login");
    } catch (err) {
      setRegMsg({ text: err.message, ok: false });
    } finally {
      setRegBusy(false);
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    setLoginMsg({ text: "", ok: false });
    setLoginBusy(true);
    try {
      const resp = await api("/auth/login", { method: "POST", auth: false, body: loginForm });
      
      // If server requires 2FA authentication
      if (resp.requires2FA) {
        setTempToken(resp.token || resp.tempToken);
        setScreen("2fa_verify");
      } else {
        tokenRef.current = resp.token;
        setToken(resp.token);
        const me = await api("/users/me");
        setUser(me);
        setScreen("dashboard");
        pushToast("Welcome back, " + me.username + ".");
      }
    } catch (err) {
      setLoginMsg({ text: err.message, ok: false });
    } finally {
      setLoginBusy(false);
    }
  }

  async function handleVerify2FA(e) {
    e.preventDefault();
    setTwoFactorMsg({ text: "", ok: false });
    setTwoFactorBusy(true);

    try {
      const resp = await api("/api/2fa/verify", {
        method: "POST",
        overrideToken: tempToken,
        body: { code: parseInt(twoFactorCode, 10) },
      });

      const finalToken = resp.token || tempToken;
      tokenRef.current = finalToken;
      setToken(finalToken);
      setTempToken(null);
      setTwoFactorCode("");

      const me = await api("/users/me");
      setUser(me);
      setScreen("dashboard");
      pushToast("Welcome back, " + me.username + ".");
    } catch (err) {
      setTwoFactorMsg({ text: err.message || "Invalid 2FA Code", ok: false });
    } finally {
      setTwoFactorBusy(false);
    }
  }

  // 2FA Management in Dashboard
  async function handleSetup2FA() {
    try {
      const data = await api("/api/2fa/setup", { method: "POST" });
      setTwoFactorSetupData(data);
    } catch (err) {
      pushToast("Failed to initiate 2FA setup: " + err.message, true);
    }
  }

  function handleLogout() {
    leaveRoomCleanup();
    setToken(null);
    setTempToken(null);
    setUser(null);
    setScreen("auth");
  }

  // ---------- rooms ----------
  async function handleCreateRoom() {
    setDashMsg("");
    try {
      const r = await api("/rooms", { method: "POST" });
      await enterRoom(r);
    } catch (err) {
      setDashMsg(err.message);
    }
  }

  async function handleJoinRoom() {
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    setDashMsg("");
    try {
      await api("/rooms/" + encodeURIComponent(code) + "/join", { method: "POST" });
      const r = await api("/rooms/" + encodeURIComponent(code));
      await enterRoom(r);
    } catch (err) {
      setDashMsg(err.message);
    }
  }

  async function enterRoom(r) {
    setRoom(r);
    roomRef.current = r;
    setMessages([]);
    setParticipants([]);
    setRemoteUsers([]);
    setScreen("room");
    await setupLocalMedia();
    connectSocket(r);
  }

  function copyRoomCode() {
    if (!room) return;
    navigator.clipboard?.writeText(room.roomCode).then(() => pushToast("Room code copied."));
  }

  async function handleLeaveRoom() {
    try {
      if (roomRef.current) await api("/rooms/" + encodeURIComponent(roomRef.current.roomCode) + "/leave", { method: "POST" });
    } catch {
      /* non-fatal */
    }
    leaveRoomCleanup();
    setScreen("dashboard");
  }

  function leaveRoomCleanup() {
    const stomp = stompRef.current;
    if (stomp && roomRef.current && userRef.current) {
      try {
        stomp.send("/app/room.leave/" + roomRef.current.roomCode, {}, JSON.stringify({ sender: userRef.current.username }));
      } catch {}
    }
    subsRef.current.forEach((s) => {
      try {
        s.unsubscribe();
      } catch {}
    });
    subsRef.current = [];
    if (stomp) {
      try {
        stomp.disconnect();
      } catch {}
    }
    stompRef.current = null;
    setConnStatus("not connected");

    peersRef.current.forEach((pc) => {
      try {
        pc.close();
      } catch {}
    });
    peersRef.current.clear();
    remoteVideoRefs.current.clear();
    setRemoteUsers([]);

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    setRoom(null);
    roomRef.current = null;
  }

  useEffect(() => {
    return () => leaveRoomCleanup();
  }, []);

  // ---------- media / WebRTC ----------
  async function setupLocalMedia() {
    try {
      localStreamRef.current = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    } catch {
      pushToast("Couldn't access camera/mic — joining audio/video off.", true);
      localStreamRef.current = new MediaStream();
    }
    if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current;
  }

  function attachRemoteVideo(username, el) {
    if (el) remoteVideoRefs.current.set(username, el);
    else remoteVideoRefs.current.delete(username);
  }

  function getOrCreatePeer(username) {
    if (peersRef.current.has(username)) return peersRef.current.get(username);
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    (localStreamRef.current?.getTracks() || []).forEach((track) => pc.addTrack(track, localStreamRef.current));

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        sendSignal({
          type: "ICE_CANDIDATE",
          target: username,
          candidate: e.candidate.candidate,
          sdpMid: e.candidate.sdpMid,
          sdpMLineIndex: e.candidate.sdpMLineIndex,
        });
      }
    };

    pc.ontrack = (e) => {
      setRemoteUsers((prev) => (prev.includes(username) ? prev : [...prev, username]));
      const attach = () => {
        const el = remoteVideoRefs.current.get(username);
        if (el) el.srcObject = e.streams[0];
        else setTimeout(attach, 50);
      };
      attach();
    };

    pc.onconnectionstatechange = () => {
      if (["failed", "closed", "disconnected"].includes(pc.connectionState)) {
        setRemoteUsers((prev) => prev.filter((u) => u !== username));
      }
    };

    peersRef.current.set(username, pc);
    return pc;
  }

  async function initiateCallTo(username) {
    const pc = getOrCreatePeer(username);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    sendSignal({ type: "OFFER", target: username, sdp: offer.sdp });
  }

  async function handleSignal(signal) {
    const from = signal.sender;
    if (!from || from === userRef.current?.username) return;
    const pc = getOrCreatePeer(from);

    if (signal.type === "OFFER") {
      await pc.setRemoteDescription({ type: "offer", sdp: signal.sdp });
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      sendSignal({ type: "ANSWER", target: from, sdp: answer.sdp });
    } else if (signal.type === "ANSWER") {
      await pc.setRemoteDescription({ type: "answer", sdp: signal.sdp });
    } else if (signal.type === "ICE_CANDIDATE" && signal.candidate) {
      try {
        await pc.addIceCandidate({ candidate: signal.candidate, sdpMid: signal.sdpMid, sdpMLineIndex: signal.sdpMLineIndex });
      } catch {
        /* ignore late candidates */
      }
    }
  }

  function sendSignal(partial) {
    const stomp = stompRef.current;
    if (!stomp || !roomRef.current) return;
    const payload = { roomId: roomRef.current.roomCode, sender: userRef.current.username, ...partial };
    stomp.send("/app/signal.send", {}, JSON.stringify(payload));
  }

  function toggleMic() {
    setMicOn((prev) => {
      const next = !prev;
      localStreamRef.current?.getAudioTracks().forEach((t) => (t.enabled = next));
      return next;
    });
  }
  function toggleCam() {
    setCamOn((prev) => {
      const next = !prev;
      localStreamRef.current?.getVideoTracks().forEach((t) => (t.enabled = next));
      return next;
    });
  }

  // ---------- STOMP ----------
  function connectSocket(r) {
    setConnStatus("connecting");
    const sock = new SockJS(serverUrl.replace(/\/$/, "") + "/ws");
    const client = Stomp.over(sock);
    client.debug = null;
    stompRef.current = client;

    const headers = { Authorization: "Bearer " + tokenRef.current };

    client.connect(
      headers,
      () => {
        setConnStatus("connected");
        const roomCode = r.roomCode;

        subsRef.current.push(
          client.subscribe("/topic/room." + roomCode + ".chat", (frame) => {
            onChatFrame(JSON.parse(frame.body));
          })
        );
        subsRef.current.push(
          client.subscribe("/topic/room." + roomCode + ".roster", (frame) => {
            onRosterFrame(JSON.parse(frame.body));
          })
        );
        subsRef.current.push(
          client.subscribe("/user/queue/signal", (frame) => {
            handleSignal(JSON.parse(frame.body)).catch(() => {});
          })
        );

        client.send("/app/room.join/" + roomCode, {}, JSON.stringify({ sender: userRef.current.username }));
      },
      () => {
        setConnStatus("disconnected");
        pushToast("Realtime connection lost. Chat and video won't update live.", true);
      }
    );
  }

  function onChatFrame(msg) {
    if (msg.type === "JOIN") {
      setMessages((m) => [...m, { system: true, text: msg.sender + " joined the room", id: Math.random() }]);
    } else if (msg.type === "LEAVE") {
      setMessages((m) => [...m, { system: true, text: msg.sender + " left the room", id: Math.random() }]);
    } else {
      setMessages((m) => [...m, { system: false, sender: msg.sender, content: msg.content, timestamp: msg.timestamp, id: Math.random() }]);
    }
  }

  function onRosterFrame(roster) {
    const list = roster.participants || [];
    setParticipants(list);
    const others = list.filter((u) => u !== userRef.current.username);

    others.forEach((username) => {
      if (!peersRef.current.has(username) && userRef.current.username < username) {
        initiateCallTo(username);
      }
    });

    peersRef.current.forEach((pc, username) => {
      if (!others.includes(username)) {
        pc.close();
        peersRef.current.delete(username);
        setRemoteUsers((prev) => prev.filter((u) => u !== username));
      }
    });
  }

  function sendChat() {
    const text = chatInput.trim();
    if (!text || !stompRef.current || !roomRef.current) return;
    stompRef.current.send(
      "/app/chat.send/" + roomRef.current.roomCode,
      {},
      JSON.stringify({ sender: userRef.current.username, content: text })
    );
    setChatInput("");
  }

  // ==================== render ====================
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
      <TopBar serverUrl={serverUrl} setServerUrl={setServerUrl} connStatus={screen === "room" ? connStatus : null} />

      {screen === "oauth_processing" && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-400 font-medium">Authenticating via Google...</p>
        </div>
      )}

      {screen === "auth" && (
        <AuthScreen
          serverUrl={serverUrl}
          authTab={authTab}
          setAuthTab={setAuthTab}
          loginForm={loginForm}
          setLoginForm={setLoginForm}
          regForm={regForm}
          setRegForm={setRegForm}
          loginMsg={loginMsg}
          regMsg={regMsg}
          loginBusy={loginBusy}
          regBusy={regBusy}
          onLogin={handleLogin}
          onRegister={handleRegister}
        />
      )}

      {screen === "2fa_verify" && (
        <TwoFactorVerifyScreen
          code={twoFactorCode}
          setCode={setTwoFactorCode}
          onVerify={handleVerify2FA}
          busy={twoFactorBusy}
          msg={twoFactorMsg}
          onBack={() => setScreen("auth")}
        />
      )}

      {screen === "dashboard" && user && (
        <DashboardScreen
          user={user}
          onLogout={handleLogout}
          onCreateRoom={handleCreateRoom}
          joinCode={joinCode}
          setJoinCode={setJoinCode}
          onJoinRoom={handleJoinRoom}
          dashMsg={dashMsg}
          onSetup2FA={handleSetup2FA}
          setupData={twoFactorSetupData}
        />
      )}

      {screen === "room" && room && user && (
        <RoomScreen
          room={room}
          user={user}
          onCopyCode={copyRoomCode}
          onLeave={handleLeaveRoom}
          localVideoRef={localVideoRef}
          remoteUsers={remoteUsers}
          attachRemoteVideo={attachRemoteVideo}
          micOn={micOn}
          camOn={camOn}
          toggleMic={toggleMic}
          toggleCam={toggleCam}
          sidebarTab={sidebarTab}
          setSidebarTab={setSidebarTab}
          messages={messages}
          chatLogRef={chatLogRef}
          chatInput={chatInput}
          setChatInput={setChatInput}
          sendChat={sendChat}
          participants={participants}
          currentUsername={user.username}
        />
      )}

      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 items-center">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={
              "px-4 py-2.5 rounded-lg text-sm shadow-lg border " +
              (t.isErr ? "bg-slate-900 border-rose-500/50 text-rose-400" : "bg-slate-900 border-slate-700 text-slate-200")
            }
          >
            {t.text}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ==================== subcomponents ==================== */

function TopBar({ serverUrl, setServerUrl, connStatus }) {
  const online = connStatus === "connected";
  return (
    <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-800 bg-slate-950/70 backdrop-blur sticky top-0 z-10">
      <div className="flex items-center gap-2.5">
        <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-[0_0_0_4px_rgba(99,102,241,0.18)]" />
        <span className="font-semibold text-lg tracking-tight">Relay</span>
      </div>
      <div className="flex items-center gap-3">
        {connStatus && (
          <span className="flex items-center gap-1.5 text-xs text-slate-400">
            <Circle size={7} fill={online ? "#22d3ee" : "#f43f5e"} strokeWidth={0} />
            {connStatus}
          </span>
        )}
        <input
          value={serverUrl}
          onChange={(e) => setServerUrl(e.target.value)}
          spellCheck={false}
          className="bg-slate-900 border border-slate-800 text-slate-400 rounded-md px-2.5 py-1.5 text-xs w-48 focus:outline-none focus:border-indigo-500 focus:text-slate-100"
        />
      </div>
    </div>
  );
}

function AuthScreen({ serverUrl, authTab, setAuthTab, loginForm, setLoginForm, regForm, setRegForm, loginMsg, regMsg, loginBusy, regBusy, onLogin, onRegister }) {
  const handleGoogleLogin = () => {
    window.location.href = `${serverUrl.replace(/\/$/, "")}/oauth2/authorization/google`;
  };

  return (
    <div className="flex-1 flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-8 relative overflow-hidden">
        <div className="pointer-events-none absolute -top-16 -right-16 w-56 h-56 rounded-full bg-indigo-500/20 blur-3xl" />
        
        {/* Tab Buttons */}
        <div className="flex gap-1 bg-slate-950 rounded-lg p-1 mb-6 relative">
          <button
            onClick={() => setAuthTab("login")}
            className={"flex-1 py-2 rounded-md text-sm font-semibold transition " + (authTab === "login" ? "bg-indigo-500 text-white" : "text-slate-400")}
          >
            Log in
          </button>
          <button
            onClick={() => setAuthTab("register")}
            className={"flex-1 py-2 rounded-md text-sm font-semibold transition " + (authTab === "register" ? "bg-indigo-500 text-white" : "text-slate-400")}
          >
            Register
          </button>
        </div>

        {/* Google OAuth Button */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium py-2.5 px-4 rounded-lg border border-slate-700 transition duration-200"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
          </svg>
          <span>Continue with Google</span>
        </button>

        {/* Divider */}
        <div className="flex items-center my-5">
          <div className="flex-1 border-t border-slate-800" />
          <span className="px-3 text-xs text-slate-500 uppercase tracking-wider">OR</span>
          <div className="flex-1 border-t border-slate-800" />
        </div>

        {/* Form Switch */}
        {authTab === "login" ? (
          <form onSubmit={onLogin}>
            <Field label="Email">
              <input
                type="email"
                required
                value={loginForm.email}
                onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                className={inputClass}
              />
            </Field>
            <Field label="Password">
              <input
                type="password"
                required
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                className={inputClass}
              />
            </Field>
            <button type="submit" disabled={loginBusy} className={primaryBtn}>
              {loginBusy ? "Logging in…" : "Log in"}
            </button>
            {loginMsg.text && (
              <p className={"text-center text-xs mt-3 " + (loginMsg.ok ? "text-cyan-400" : "text-rose-400")}>
                {loginMsg.text}
              </p>
            )}
          </form>
        ) : (
          <form onSubmit={onRegister}>
            <Field label="Username">
              <input
                type="text"
                required
                minLength={3}
                maxLength={20}
                value={regForm.username}
                onChange={(e) => setRegForm({ ...regForm, username: e.target.value })}
                className={inputClass}
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                required
                value={regForm.email}
                onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                className={inputClass}
              />
            </Field>
            <Field label="Password">
              <input
                type="password"
                required
                minLength={6}
                value={regForm.password}
                onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
                className={inputClass}
              />
            </Field>
            <button type="submit" disabled={regBusy} className={primaryBtn}>
              {regBusy ? "Creating…" : "Create account"}
            </button>
            {regMsg.text && (
              <p className={"text-center text-xs mt-3 " + (regMsg.ok ? "text-cyan-400" : "text-rose-400")}>
                {regMsg.text}
              </p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}

function TwoFactorVerifyScreen({ code, setCode, onVerify, busy, msg, onBack }) {
  return (
    <div className="flex-1 flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center">
        <div className="w-12 h-12 bg-indigo-500/10 text-indigo-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-indigo-500/20">
          <KeyRound size={24} />
        </div>
        <h2 className="text-xl font-semibold mb-1">Two-Factor Authentication</h2>
        <p className="text-xs text-slate-400 mb-6">Enter the 6-digit code from your authenticator app.</p>

        <form onSubmit={onVerify}>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="123456"
            className="w-full text-center text-2xl font-mono tracking-widest bg-slate-950 border border-slate-800 text-slate-100 rounded-lg px-3 py-3 mb-4 focus:outline-none focus:border-indigo-500"
            autoFocus
          />
          <button type="submit" disabled={busy || code.length !== 6} className={primaryBtn}>
            {busy ? "Verifying…" : "Verify code"}
          </button>
          {msg.text && (
            <p className={"text-center text-xs mt-3 " + (msg.ok ? "text-cyan-400" : "text-rose-400")}>
              {msg.text}
            </p>
          )}
        </form>

        <button onClick={onBack} className="mt-4 text-xs text-slate-400 hover:text-slate-200">
          ← Back to login
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="mb-3.5">
      <label className="block text-xs text-slate-400 font-medium mb-1.5">{label}</label>
      {children}
    </div>
  );
}

const inputClass =
  "w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-500";
const primaryBtn =
  "w-full rounded-lg py-2.5 font-semibold text-sm text-white bg-gradient-to-br from-indigo-500 to-violet-500 disabled:opacity-50 active:scale-[0.98] transition";
const ghostBtn = "rounded-lg py-2 px-4 font-semibold text-sm bg-slate-800 border border-slate-700 text-slate-100";

function DashboardScreen({ user, onLogout, onCreateRoom, joinCode, setJoinCode, onJoinRoom, dashMsg, onSetup2FA, setupData }) {
  return (
    <div className="flex-1 flex flex-col items-center px-5 py-12">
      <div className="w-full max-w-xl">
        <div className="flex items-center justify-between mb-7">
          <div>
            <h2 className="text-xl font-semibold mb-1">Your rooms</h2>
            <div className="text-xs text-slate-400">
              Signed in as <b className="text-slate-200 font-semibold">{user.username}</b>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onSetup2FA} className="flex items-center gap-1.5 text-xs bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-3 py-2 rounded-lg hover:bg-indigo-500/20">
              <ShieldCheck size={14} /> 2FA Setup
            </button>
            <button onClick={onLogout} className={ghostBtn}>
              Log out
            </button>
          </div>
        </div>

        {setupData && (
          <div className="mb-6 bg-slate-900 border border-indigo-500/30 rounded-2xl p-5 flex flex-col items-center text-center gap-3">
            <h3 className="font-semibold text-sm text-indigo-400">Scan QR Code into Authenticator App</h3>
            <p className="text-xs text-slate-400">Use Google Authenticator or Authy to scan this key secret:</p>
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-xs text-slate-200 select-all">
              {setupData.secret}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col gap-3">
            <h3 className="font-semibold text-base">Start a room</h3>
            <p className="text-xs text-slate-400 leading-relaxed">Create a fresh room and share the code with anyone you want to bring in.</p>
            <button onClick={onCreateRoom} className={primaryBtn}>
              Create room
            </button>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col gap-3">
            <h3 className="font-semibold text-base">Join a room</h3>
            <p className="text-xs text-slate-400 leading-relaxed">Already have a code? Drop it in and jump straight to the call.</p>
            <div className="flex gap-2">
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && onJoinRoom()}
                placeholder="ROOM CODE"
                maxLength={12}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-sm uppercase tracking-wider focus:outline-none focus:border-indigo-500"
              />
              <button onClick={onJoinRoom} className="rounded-lg px-4 font-semibold text-sm text-white bg-gradient-to-br from-indigo-500 to-violet-500">
                Join
              </button>
            </div>
          </div>
        </div>
        {dashMsg && <p className="text-rose-400 text-xs mt-4 text-center">{dashMsg}</p>}
      </div>
    </div>
  );
}

function VideoTile({ label, isYou, videoRef }) {
  return (
    <div className="relative aspect-video bg-slate-900 rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center">
      <video ref={videoRef} autoPlay playsInline muted={isYou} className="w-full h-full object-cover" />
      <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded-md bg-slate-950/70 backdrop-blur text-xs font-medium text-slate-200 border border-slate-800">
        {label}
      </div>
    </div>
  );
}

function CtlButton({ children, onClick, off }) {
  return (
    <button
      onClick={onClick}
      className={
        "w-11 h-11 rounded-full flex items-center justify-center transition border " +
        (off ? "bg-rose-500/10 border-rose-500/30 text-rose-400" : "bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700")
      }
    >
      {children}
    </button>
  );
}

function RoomScreen({
  room,
  user,
  onCopyCode,
  onLeave,
  localVideoRef,
  remoteUsers,
  attachRemoteVideo,
  micOn,
  camOn,
  toggleMic,
  toggleCam,
  sidebarTab,
  setSidebarTab,
  messages,
  chatLogRef,
  chatInput,
  setChatInput,
  sendChat,
  participants,
  currentUsername,
}) {
  const hasRemote = remoteUsers.length > 0;
  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800 bg-slate-900">
        <div className="flex items-center gap-2.5 bg-slate-950 border border-slate-800 rounded-full pl-4 pr-2 py-1.5">
          <span className="font-semibold tracking-[0.14em] text-sm">{room.roomCode}</span>
          <button onClick={onCopyCode} className="text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-md px-2 py-1 text-xs flex items-center gap-1">
            <Copy size={12} /> Copy
          </button>
        </div>
        <div className="text-xs text-slate-400">
          You are <b className="text-slate-200 font-semibold">{user.username}</b>
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        <div className="flex-1 flex flex-col gap-3.5 p-4 min-w-0">
          <div className="flex-1 grid gap-3 content-start" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
            <VideoTile label={user.username + " (you)"} isYou videoRef={localVideoRef} />
            {remoteUsers.map((u) => (
              <VideoTile key={u} label={u} videoRef={(el) => attachRemoteVideo(u, el)} />
            ))}
          </div>
          {!hasRemote && (
            <div className="border border-dashed border-slate-800 rounded-xl min-h-[140px] flex flex-col items-center justify-center gap-2 text-slate-500 text-sm">
              <div className="text-xl">◎</div>
              <div>Waiting for others to join…</div>
            </div>
          )}

          <div className="flex justify-center gap-2.5 pt-1">
            <CtlButton onClick={toggleMic} off={!micOn}>
              {micOn ? <Mic size={18} /> : <MicOff size={18} />}
            </CtlButton>
            <CtlButton onClick={toggleCam} off={!camOn}>
              {camOn ? <Video size={18} /> : <VideoOff size={18} />}
            </CtlButton>
            <button
              onClick={onLeave}
              className="h-[46px] px-5 rounded-full bg-rose-500 text-white text-sm font-semibold flex items-center gap-2"
            >
              <PhoneOff size={16} /> Leave room
            </button>
          </div>
        </div>

        <div className="w-72 flex-shrink-0 border-l border-slate-800 bg-slate-900 flex flex-col">
          <div className="flex border-b border-slate-800">
            <button
              onClick={() => setSidebarTab("chat")}
              className={"flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 " + (sidebarTab === "chat" ? "text-slate-100 border-indigo-500" : "text-slate-400 border-transparent")}
            >
              <MessageSquare size={13} /> Chat
            </button>
            <button
              onClick={() => setSidebarTab("people")}
              className={"flex-1 py-3 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 " + (sidebarTab === "people" ? "text-slate-100 border-indigo-500" : "text-slate-400 border-transparent")}
            >
              <Users size={13} /> People
            </button>
          </div>

          {sidebarTab === "chat" ? (
            <>
              <div ref={chatLogRef} className="flex-1 overflow-y-auto p-3.5 flex flex-col gap-2.5">
                {messages.map((m) =>
                  m.system ? (
                    <div key={m.id} className="text-center text-[11px] italic text-slate-500">
                      {m.text}
                    </div>
                  ) : (
                    <div key={m.id} className="text-[13px] leading-relaxed">
                      <span className={"font-semibold mr-1.5 " + (m.sender === currentUsername ? "text-indigo-400" : "text-cyan-400")}>{m.sender}</span>
                      {m.content}
                      <span className="text-[10px] text-slate-500 ml-1.5">{fmtTime(m.timestamp)}</span>
                    </div>
                  )
                )}
              </div>
              <div className="flex gap-2 p-3 border-t border-slate-800">
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendChat()}
                  placeholder="Message the room…"
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                />
                <button onClick={sendChat} className="w-10 rounded-lg bg-indigo-500 text-white flex items-center justify-center">
                  <Send size={15} />
                </button>
              </div>
            </>
          ) : (
            <ul className="p-2.5 overflow-y-auto flex-1">
              {participants.map((p) => (
                <li key={p} className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-slate-300">
                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                  {p} {p === currentUsername ? "(you)" : ""}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}