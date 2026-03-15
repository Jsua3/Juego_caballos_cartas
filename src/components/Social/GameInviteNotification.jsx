import { motion, AnimatePresence } from 'framer-motion';
import { playSound } from '../../utils/sound';
import AvatarCircle from '../Shared/AvatarCircle';
import socket from '../../socket';

export default function GameInviteNotification({ invites, onAccept, onDismiss }) {
  if (!invites || invites.length === 0) return null;

  const handleAccept = (invite) => {
    playSound('advance');
    socket.emit('respond_game_invite', { inviteId: invite.inviteId, accept: true });
    onAccept(invite.roomCode);
    onDismiss(invite.inviteId);
  };

  const handleReject = (invite) => {
    playSound('click');
    socket.emit('respond_game_invite', { inviteId: invite.inviteId, accept: false });
    onDismiss(invite.inviteId);
  };

  return (
    <div className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2">
      <AnimatePresence>
        {invites.map((invite) => (
          <motion.div
            key={invite.inviteId}
            initial={{ opacity: 0, x: 80, scale: 0.9 }}
            animate={{ opacity: 1, x: 0,  scale: 1 }}
            exit={{    opacity: 0, x: 80, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
            className="rounded-2xl p-4 flex flex-col gap-3 w-72"
            style={{
              background: 'linear-gradient(135deg, #0d1f12, #091508)',
              border:     '1px solid rgba(255,215,0,0.3)',
              boxShadow:  '0 0 30px rgba(0,0,0,0.8), 0 0 20px rgba(255,215,0,0.1)',
            }}
          >
            {/* Invite info */}
            <div className="flex items-center gap-2">
              <AvatarCircle src={invite.senderAvatar} username={invite.senderUsername} size={36} />
              <div>
                <p className="text-white text-xs font-bold">{invite.senderUsername}</p>
                <p className="text-gray-400 text-xs">Te invita a jugar</p>
              </div>
              <span
                className="ml-auto font-mono text-yellow-400 font-black text-sm"
                style={{ letterSpacing: 2 }}
              >
                {invite.roomCode}
              </span>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <motion.button
                onClick={() => handleAccept(invite)}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="flex-1 py-2 rounded-xl text-xs font-bold"
                style={{
                  background: 'linear-gradient(135deg, #065F46, #10B981)',
                  border: '1px solid #10B981',
                  color: '#fff',
                }}
              >
                ✓ Unirse
              </motion.button>
              <motion.button
                onClick={() => handleReject(invite)}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="flex-1 py-2 rounded-xl text-xs font-bold"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: '#9CA3AF',
                }}
              >
                Rechazar
              </motion.button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
