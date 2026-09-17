from django.contrib.auth.decorators import login_required
from django.shortcuts import render

from .models import Notification


@login_required
def notification_list(request):
    notifications = list(request.user.notifications.all())

    unread_ids = [n.id for n in notifications if not n.is_read]
    if unread_ids:
        Notification.objects.filter(id__in=unread_ids).update(is_read=True)

    return render(
        request, "notifications/notification_list.html", {"notifications": notifications}
    )
