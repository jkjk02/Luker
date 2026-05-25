import { getRequestHeaders } from '../script.js';
import { t } from './i18n.js';

const DISMISS_KEY = 'luker_update_dismissed_until';
const CHECK_INTERVAL = 2 * 60 * 60 * 1000;
const DISMISS_DURATION = 24 * 60 * 60 * 1000;

function isDismissed() {
    const until = localStorage.getItem(DISMISS_KEY);
    return until && Date.now() < Number(until);
}

function dismiss() {
    localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_DURATION));
}

async function checkForUpdate() {
    if (isDismissed()) return;
    try {
        const response = await fetch('/api/users-admin/update/check', {
            method: 'POST',
            headers: getRequestHeaders(),
        });
        if (!response.ok) return;
        const data = await response.json();
        if (!data.hasUpdate) return;
        showNotification(data);
    } catch {
        // silently fail
    }
}

function showNotification(data) {
    const { isGitRepo, details } = data;
    let message, actionText, actionFn;

    if (isGitRepo) {
        message = t`New update available (${details.behindCount || '?'} commits behind)`;
        actionText = t`Update Now`;
        actionFn = startUpdate;
    } else {
        message = t`New version ${details.latestVersion || ''} available`;
        actionText = t`Download`;
        actionFn = () => window.open(details.downloadUrl || details.releaseUrl, '_blank');
    }

    const $toast = toastr.info(
        `<span>${message}</span><br>` +
        `<button class="btn btn-primary update-action-btn" style="margin-top:5px;margin-right:5px;">${actionText}</button>` +
        `<button class="btn update-dismiss-btn" style="margin-top:5px;">${t`Later`}</button>`,
        '',
        { timeOut: 0, extendedTimeOut: 0, closeButton: true, tapToDismiss: false, allowHtml: true },
    );

    $toast.find('.update-action-btn').on('click', () => {
        toastr.clear($toast);
        actionFn();
    });
    $toast.find('.update-dismiss-btn').on('click', () => {
        toastr.clear($toast);
        dismiss();
    });
}

async function startUpdate() {
    toastr.info(t`Update started, please wait...`);
    try {
        const response = await fetch('/api/users-admin/update/start', {
            method: 'POST',
            headers: getRequestHeaders(),
        });
        if (response.ok) {
            toastr.success(t`Update complete! Restart to apply changes.`);
        } else {
            toastr.error(t`Update failed.`);
        }
    } catch {
        toastr.error(t`Update failed.`);
    }
}

export function initUpdateChecker() {
    setTimeout(checkForUpdate, 10000);
    setInterval(checkForUpdate, CHECK_INTERVAL);
}
