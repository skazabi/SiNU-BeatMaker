from fastapi import APIRouter, HTTPException, Depends, status
from app.database import tasks_collection
from app.middleware.auth_middleware import get_current_user

router = APIRouter(prefix="/tasks", tags=["Tasks"])

@router.get("/{task_id}")
async def get_task_status(task_id: str, current_user: dict = Depends(get_current_user)):
    """
    Belirtilen asenkron görevin (task) anlık durumunu sorgular.
    """
    task = await tasks_collection.find_one({"task_id": task_id})
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Görev bulunamadı."
        )
        
    # Güvenlik: Sadece görevi oluşturan kişi veya admin görebilir
    if task["username"] != current_user["username"] and current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Bu görevin durumunu görüntüleme yetkiniz bulunmamaktadır."
        )
        
    return {
        "task_id": task["task_id"],
        "type": task["type"],
        "status": task["status"],
        "created_at": task["created_at"],
        "updated_at": task["updated_at"],
        "error": task.get("error")
    }

@router.get("/{task_id}/result")
async def get_task_result(task_id: str, current_user: dict = Depends(get_current_user)):
    """
    Tamamlanan asenkron görevin sonucunu döner.
    """
    task = await tasks_collection.find_one({"task_id": task_id})
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Görev bulunamadı."
        )
        
    if task["username"] != current_user["username"] and current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Bu görevin sonucunu görüntüleme yetkiniz bulunmamaktadır."
        )
        
    if task["status"] != "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail=f"Görev henüz tamamlanmadı. Mevcut Durum: {task['status']}"
        )
        
    return task.get("result")
