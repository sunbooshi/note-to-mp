import { Announcement as IAnnouncement } from "src/weixin-api";
import { Cross2Icon, BellIcon } from "@radix-ui/react-icons";
import { openInBrowser } from "src/utils";
import styles from "./Announcement.module.css";

interface AnnouncementProps {
  announcement: IAnnouncement;
  onDismiss: () => void;
}

export const Announcement: React.FC<AnnouncementProps> = ({ announcement, onDismiss }) => {
  const handleAction = () => {
    if (announcement.action_url) {
      openInBrowser(announcement.action_url);
      onDismiss();
    }
  };

  return (
    <div className={styles.Root}>
      <BellIcon className={styles.Icon} />
      <div className={styles.Content}>
        <div className={styles.Title}>{announcement.title}</div>
      </div>
      <div className={styles.Actions}>
        {announcement.action_url && (
          <button className={styles.ActionButton} onClick={handleAction}>
            查看
          </button>
        )}
        <button
          className={styles.DismissButton}
          onClick={onDismiss}
          title="忽略"
        >
          <Cross2Icon />
        </button>
      </div>
    </div>
  );
};
