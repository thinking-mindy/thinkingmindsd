import * as React from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from '@mui/material';

interface ReplyDialogProps {
  open: boolean;
  onClose: () => void;
  commentId: string;
  commentAuthor: string;
  onSendReply: (content: string) => void;
}

export default function ReplyDialog({
  open,
  onClose,
  commentAuthor,
  onSendReply,
}: ReplyDialogProps) {
  const [replyContent, setReplyContent] = React.useState('');

  const handleSend = () => {
    if (replyContent.trim()) {
      onSendReply(replyContent.trim());
      setReplyContent('');
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Reply to {commentAuthor}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          You are replying to a comment by {commentAuthor}.
        </Typography>
        <TextField
          autoFocus
          margin="dense"
          label="Your Reply"
          type="text"
          fullWidth
          multiline
          rows={4}
          value={replyContent}
          onChange={(e) => setReplyContent(e.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary">
          Cancel
        </Button>
        <Button onClick={handleSend} color="primary" variant="contained" disabled={!replyContent.trim()}>
          Send Reply
        </Button>
      </DialogActions>
    </Dialog>
  );
}